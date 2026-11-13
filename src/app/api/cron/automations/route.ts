import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getGoogleAccessToken, googleFetch, type DriveAccount } from "@/lib/drive/google";
export const runtime = "nodejs";
export const maxDuration = 60;

function nextRun(interval: string) {
  const now = Date.now();
  return new Date(now + (interval === "weekly" ? 604800000 : 86400000)).toISOString();
}
async function syncAccount(db: any, account: DriveAccount & { workspace_id?: string | null }) {
  const token = await getGoogleAccessToken(account, db);
  const about = await googleFetch(token, "/about?fields=storageQuota");
  const quota = about.ok ? (await about.json()).storageQuota ?? {} : {};
  const { error: quotaError } = await db.from("connected_accounts").update({
    storage_used_bytes: quota.usage ? Number(quota.usage) : null,
    storage_total_bytes: quota.limit ? Number(quota.limit) : null,
    last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }).eq("id", account.id).eq("owner_id", account.owner_id);
  if (quotaError) throw quotaError;
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", "trashed = false");
  url.searchParams.set("pageSize", "1000");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  url.searchParams.set("fields", "files(id,name,mimeType,size,modifiedTime,webViewLink,parents,md5Checksum)");
  const response = await fetch(url, { headers: { authorization: "Bearer " + token }, cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Drive metadata sync failed.");
  const rows = (payload.files ?? []).map((f: any) => ({
    owner_id: account.owner_id, workspace_id: account.workspace_id ?? null, connected_account_id: account.id,
    provider_file_id: f.id, parent_provider_file_id: f.parents?.[0] ?? null, name: f.name,
    mime_type: f.mimeType, size_bytes: Number(f.size ?? 0), provider_md5_checksum: f.md5Checksum ?? null,
    is_folder: f.mimeType === "application/vnd.google-apps.folder", trashed: false,
    modified_at: f.modifiedTime ?? null, web_view_url: f.webViewLink ?? null, synced_at: new Date().toISOString()
  }));
  if (rows.length) {
    const { error } = await db.from("file_metadata").upsert(rows, { onConflict: "connected_account_id,provider_file_id" });
    if (error) throw error;
  }
  return { filesSynced: rows.length, quota };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !serviceKey || !supabaseUrl) return NextResponse.json({ error: "Automation scheduler is not configured. Add CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY to the server environment." }, { status: 503 });
  if (request.headers.get("authorization") !== "Bearer " + secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const db = createSupabaseClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const now = new Date().toISOString();
  const { data: rules, error } = await db.from("automation_rules").select("*").eq("enabled", true).lte("next_run_at", now).order("next_run_at").limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const results = [];
  for (const rule of rules ?? []) {
    const claim = await db.from("automation_rules").update({ next_run_at: nextRun(rule.schedule_interval ?? "daily") })
      .eq("id", rule.id).eq("enabled", true).lte("next_run_at", now).select("id").maybeSingle();
    if (claim.error || !claim.data) continue;
    const { data: run } = await db.from("automation_runs").insert({ automation_rule_id: rule.id, owner_id: rule.owner_id, status: "running" }).select("id").single();
    try {
      const { data: accounts, error: accountError } = await db.from("connected_accounts")
        .select("id,owner_id,provider,email,display_name,token_ciphertext,token_iv,token_auth_tag,token_expires_at,workspace_id")
        .eq("owner_id", rule.owner_id).eq("provider", "google_drive").eq("status", "connected");
      if (accountError) throw accountError;
      const accountResults = [];
      for (const account of accounts ?? []) {
        if (rule.trigger_type === "scheduled_sync" || rule.trigger_type === "duplicate_review" || rule.trigger_type === "folder_organization" || rule.trigger_type === "storage_threshold") {
          accountResults.push({ account: account.email, ...(await syncAccount(db, account as DriveAccount & { workspace_id?: string | null })) });
        }
      }
      let result: any = { accounts: accountResults.length, accountResults };
      if (rule.trigger_type === "duplicate_review") {
        const { data: files } = await db.from("file_metadata").select("provider_md5_checksum,size_bytes").eq("owner_id", rule.owner_id).eq("trashed", false).eq("is_folder", false).not("provider_md5_checksum", "is", null).limit(10000);
        const counts = new Map<string, number>();
        for (const file of files ?? []) { const key = file.provider_md5_checksum + ":" + file.size_bytes; counts.set(key, (counts.get(key) ?? 0) + 1); }
        result.duplicateGroups = [...counts.values()].filter(n => n > 1).length;
      }
      if (rule.trigger_type === "storage_threshold") {
        const threshold = Math.min(99, Math.max(1, Number(rule.conditions?.thresholdPercent ?? 80)));
        const exceeded = accountResults.filter((a: any) => Number(a.quota?.limit) > 0 && Number(a.quota?.usage ?? 0) / Number(a.quota.limit) * 100 >= threshold);
        result.thresholdPercent = threshold;
        result.exceededAccounts = exceeded.map((a: any) => a.account);
        if (exceeded.length) await db.from("activity_logs").insert({ owner_id: rule.owner_id, actor_user_id: rule.owner_id, action: "storage_threshold_reached", resource_type: "automation", resource_id: rule.id, details: { automation_rule_id: rule.id, thresholdPercent: threshold, accounts: result.exceededAccounts } });
      }
      if (rule.trigger_type === "folder_organization") {
        const { data: files } = await db.from("file_metadata").select("mime_type").eq("owner_id", rule.owner_id).eq("trashed", false).eq("is_folder", false).limit(10000);
        const categories: Record<string, number> = {};
        for (const file of files ?? []) { const type = String(file.mime_type ?? "other"); const category = type.startsWith("image/") ? "Images" : type.startsWith("video/") ? "Videos" : type.includes("spreadsheet") ? "Spreadsheets" : type.includes("document") || type === "application/pdf" ? "Documents" : "Other"; categories[category] = (categories[category] ?? 0) + 1; }
        result.organizationSuggestions = categories;
      }
      await db.from("automation_runs").update({ status: "completed", completed_at: new Date().toISOString(), result }).eq("id", run?.id);
      await db.from("automation_rules").update({ last_run_at: new Date().toISOString(), last_status: "completed", run_count: Number(rule.run_count ?? 0) + 1 }).eq("id", rule.id);
      results.push({ id: rule.id, status: "completed", result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Automation failed.";
      await db.from("automation_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_message: message }).eq("id", run?.id);
      await db.from("automation_rules").update({ last_run_at: new Date().toISOString(), last_status: "failed", run_count: Number(rule.run_count ?? 0) + 1 }).eq("id", rule.id);
      results.push({ id: rule.id, status: "failed", error: message });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
