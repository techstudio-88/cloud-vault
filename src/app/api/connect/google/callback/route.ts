import { createCipheriv, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function encryptTokens(value: string) {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be configured as 64 hexadecimal characters.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(secret, "hex"), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    token_ciphertext: ciphertext.toString("base64"),
    token_iv: iv.toString("base64"),
    token_auth_tag: cipher.getAuthTag().toString("base64"),
  };
}

function fail(request: NextRequest, code: string) {
  const response = NextResponse.redirect(new URL(`/?connect_error=${encodeURIComponent(code)}`, request.url));
  response.cookies.delete("cloudvault_google_oauth_state");
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("error")) return fail(request, "google_consent_denied");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("cloudvault_google_oauth_state")?.value;
  if (!code || !state || !savedState || state !== savedState) return fail(request, "invalid_oauth_state");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(request, "session_expired");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return fail(request, "google_oauth_not_configured");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token) {
      return fail(request, "google_token_exchange_failed");
    }

    const [profileResponse, driveResponse] = await Promise.all([
      fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { authorization: `Bearer ${tokens.access_token}` }, cache: "no-store",
      }),
      fetch("https://www.googleapis.com/drive/v3/about?fields=user,storageQuota", {
        headers: { authorization: `Bearer ${tokens.access_token}` }, cache: "no-store",
      }),
    ]);
    if (!profileResponse.ok || !driveResponse.ok) return fail(request, "google_profile_fetch_failed");
    const profile = await profileResponse.json();
    const drive = await driveResponse.json();
    if (!profile.id || !profile.email) return fail(request, "google_account_unavailable");

    const encrypted = encryptTokens(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      scope: tokens.scope,
    }));
    const quota = drive.storageQuota ?? {};
    const { error } = await supabase.from("connected_accounts").upsert({
      owner_id: user.id,
      provider: "google_drive",
      provider_account_id: profile.id,
      email: profile.email,
      display_name: profile.name ?? profile.email,
      status: "connected",
      granted_scopes: String(tokens.scope ?? "").split(" ").filter(Boolean),
      storage_used_bytes: quota.usage ? Number(quota.usage) : null,
      storage_total_bytes: quota.limit ? Number(quota.limit) : null,
      token_expires_at: new Date(Date.now() + Number(tokens.expires_in ?? 3600) * 1000).toISOString(),
      ...encrypted,
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id,provider,provider_account_id" });
    if (error) throw error;

    const response = NextResponse.redirect(new URL("/?connected=google", request.url));
    response.cookies.delete("cloudvault_google_oauth_state");
    return response;
  } catch {
    return fail(request, "google_connection_failed");
  }
}
