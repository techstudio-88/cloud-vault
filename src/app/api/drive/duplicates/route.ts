import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAccessToken, googleFetch } from "@/lib/drive/google";
export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const { data: accounts, error: accountError } = await supabase.from("connected_accounts")
      .select("id,owner_id,provider,email,display_name,token_ciphertext,token_iv,token_auth_tag,token_expires_at,workspace_id")
      .eq("owner_id", user.id).eq("provider", "google_drive").eq("status", "connected");
    if (accountError) throw accountError;
    if (!accounts?.length) return NextResponse.json({ groups: [], scanned: 0 });
    let scanned = 0;
    for (const account of accounts) {
      const token = await getGoogleAccessToken(account);
      let pageToken: string | undefined;
      let pages = 0;
      do {
        const url = new URL("https://www.googleapis.com/drive/v3/files");
        url.searchParams.set("q", "trashed = false");
        url.searchParams.set("pageSize", "1000");
        url.searchParams.set("supportsAllDrives", "true");
        url.searchParams.set("includeItemsFromAllDrives", "true");
        url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,parents,md5Checksum)");
        if (pageToken) url.searchParams.set("pageToken", pageToken);
        const response = await fetch(url, { headers: { authorization: "Bearer " + token }, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message ?? "Could not scan a connected drive.");
        const rows = (payload.files ?? []).map((f: any) => ({
          owner_id: user.id, workspace_id: account.workspace_id, connected_account_id: account.id,
          provider_file_id: f.id, parent_provider_file_id: f.parents?.[0] ?? null,
          name: f.name, mime_type: f.mimeType, size_bytes: Number(f.size ?? 0),
          provider_md5_checksum: f.md5Checksum ?? null,
          is_folder: f.mimeType === "application/vnd.google-apps.folder", trashed: false,
          modified_at: f.modifiedTime ?? null, web_view_url: f.webViewLink ?? null, synced_at: new Date().toISOString()
        }));
        if (rows.length) {
          const { error } = await supabase.from("file_metadata").upsert(rows, { onConflict: "connected_account_id,provider_file_id" });
          if (error) throw error;
        }
        scanned += rows.length;
        pageToken = payload.nextPageToken;
        pages++;
      } while (pageToken && pages < 10);
    }
    const { data: indexed, error } = await supabase.from("file_metadata")
      .select("connected_account_id,provider_file_id,name,mime_type,size_bytes,provider_md5_checksum,web_view_url")
      .eq("owner_id", user.id).eq("trashed", false).eq("is_folder", false).not("provider_md5_checksum", "is", null)
      .limit(10000);
    if (error) throw error;
    const { data: connected } = await supabase.from("connected_accounts").select("id,email").eq("owner_id", user.id);
    const emailById = new Map((connected ?? []).map((a: any) => [a.id, a.email]));
    const grouped = new Map<string, any[]>();
    for (const file of indexed ?? []) {
      if (!file.provider_md5_checksum || !Number(file.size_bytes)) continue;
      const key = file.provider_md5_checksum + ":" + file.size_bytes;
      const list = grouped.get(key) ?? [];
      list.push({ accountId: file.connected_account_id, accountEmail: emailById.get(file.connected_account_id) ?? "Connected drive", fileId: file.provider_file_id, name: file.name, mimeType: file.mime_type, webViewUrl: file.web_view_url });
      grouped.set(key, list);
    }
    const groups = [...grouped.entries()].filter(([, files]) => files.length > 1).map(([checksum, files]) => ({ checksum, size: Number(files[0] ? (indexed ?? []).find((f: any) => f.provider_md5_checksum + ":" + f.size_bytes === checksum)?.size_bytes : 0), files }));
    return NextResponse.json({ groups, scanned, matchedFiles: groups.reduce((n, g) => n + g.files.length, 0) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Duplicate scan failed." }, { status: 400 });
  }
}
