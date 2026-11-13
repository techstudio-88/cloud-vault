import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const triggers = ["storage_threshold", "scheduled_sync", "duplicate_review", "folder_organization"];
const schedules = ["hourly", "daily", "weekly"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await supabase.from("automation_rules")
    .select("id,name,description,enabled,trigger_type,conditions,actions,schedule_interval,next_run_at,last_run_at,last_status,run_count,created_at")
    .eq("owner_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim().slice(0, 80);
    const trigger = String(body.triggerType ?? "scheduled_sync");
    const schedule = schedules.includes(String(body.scheduleInterval)) ? String(body.scheduleInterval) : "daily";
    if (!name) return NextResponse.json({ error: "Give this automation a name." }, { status: 400 });
    if (!triggers.includes(trigger)) return NextResponse.json({ error: "Unsupported automation type." }, { status: 400 });
    const next = new Date(Date.now() + (schedule === "hourly" ? 3600000 : schedule === "weekly" ? 604800000 : 86400000)).toISOString();
    const { data, error } = await supabase.from("automation_rules").insert({
      owner_id: user.id, name, description: String(body.description ?? "").slice(0, 240),
      enabled: false, trigger_type: trigger, conditions: body.conditions ?? {},
      actions: body.actions ?? {}, schedule_interval: schedule, next_run_at: next
    }).select("id,name,description,enabled,trigger_type,conditions,actions,schedule_interval,next_run_at,last_run_at,last_status,run_count,created_at").single();
    if (error) throw error;
    return NextResponse.json({ rule: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create automation." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
    if (typeof body.scheduleInterval === "string" && schedules.includes(body.scheduleInterval)) {
      patch.schedule_interval = body.scheduleInterval;
      patch.next_run_at = new Date(Date.now() + (body.scheduleInterval === "hourly" ? 3600000 : body.scheduleInterval === "weekly" ? 604800000 : 86400000)).toISOString();
    }
    if (!id || !Object.keys(patch).length) return NextResponse.json({ error: "No valid automation changes supplied." }, { status: 400 });
    const { data, error } = await supabase.from("automation_rules").update(patch).eq("id", id).eq("owner_id", user.id)
      .select("id,name,enabled,schedule_interval,next_run_at").single();
    if (error) throw error;
    return NextResponse.json({ rule: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update automation." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing automation id." }, { status: 400 });
  const { error } = await supabase.from("automation_rules").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
