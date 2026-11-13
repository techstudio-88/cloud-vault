import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAccessToken, googleFetch } from "@/lib/drive/google";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json();
    const size = Number(body.size);
    if (!Number.isSafeInteger(size) || size <= 0) return NextResponse.json({ error: "A valid file size is required." }, { status: 400 });
    const { data: accounts, error } = await supabase.from("connected_accounts")
      .select("id,owner_id,provider,email,display_name,token_ciphertext,token_iv,token_auth_tag,token_expires_at,storage_used_bytes,storage_total_bytes")
      .eq("owner_id", user.id).eq("provider", "google_drive").eq("status", "connected");
    if (error) throw error;
    if (!accounts?.length) return NextResponse.json({ error: "Connect at least one Google Drive account first." }, { status: 409 });
    const candidates = await Promise.all(accounts.map(async (account: any) => {
      try {
        const token = await getGoogleAccessToken(account);
        const response = await googleFetch(token, "/about?fields=storageQuota");
        if (!response.ok) return null;
        const payload = await response.json();
        const used = Number(payload.storageQuota?.usage ?? account.storage_used_bytes ?? 0);
        const total = Number(payload.storageQuota?.limit ?? account.storage_total_bytes ?? 0);
        const unlimited = !total;
        const free = unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, total - used);
        await supabase.from("connected_accounts").update({
          storage_used_bytes: used || null, storage_total_bytes: total || null, last_synced_at: new Date().toISOString()
        }).eq("id", account.id).eq("owner_id", user.id);
        return { id: account.id, email: account.email, display_name: account.display_name, free, used, total, unlimited };
      } catch { return null; }
    }));
    const ranked = candidates.filter(Boolean).sort((a: any, b: any) => b.free - a.free);
    const selected: any = ranked.find((a: any) => a.free >= size);
    if (!selected) return NextResponse.json({ error: "No connected drive has enough available capacity for this file.", candidates: ranked.map((a: any) => ({ email: a.email, freeBytes: a.free })) }, { status: 409 });
    return NextResponse.json({ account: { id: selected.id, email: selected.email, display_name: selected.display_name }, availableBytes: selected.free, routed: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not choose a destination drive." }, { status: 400 });
  }
}
