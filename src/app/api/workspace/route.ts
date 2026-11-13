import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let { data: workspace } = await supabase.from("workspaces").select("id,name,owner_id").eq("owner_id", user.id).limit(1).maybeSingle();
  if (!workspace) {
    const { data: membership } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (membership) { const result = await supabase.from("workspaces").select("id,name,owner_id").eq("id", membership.workspace_id).maybeSingle(); workspace = result.data; }
  }
  if (!workspace) return NextResponse.json({ workspace: null, members: [], invites: [] });
  const [{ data: members, error: membersError }, { data: invites, error: invitesError }] = await Promise.all([
    supabase.from("workspace_members").select("user_id,role,joined_at,created_at").eq("workspace_id", workspace.id).order("created_at"),
    supabase.from("workspace_invites").select("id,invited_email,role,expires_at,accepted_at,created_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false })
  ]);
  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 400 });
  return NextResponse.json({ workspace, members: members ?? [], invites: invitesError ? [] : invites ?? [] });
}
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "member");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (!["admin", "member", "viewer"].includes(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    if (email === user.email?.toLowerCase()) return NextResponse.json({ error: "You are already the workspace owner." }, { status: 400 });
    const { data: workspace } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
    if (!workspace) return NextResponse.json({ error: "Only the workspace owner can invite teammates." }, { status: 403 });
    const {data:sub}=await supabase.from("user_subscriptions").select("plan_id").eq("owner_id",user.id).maybeSingle();
    const {data:plan}=await supabase.from("subscription_plans").select("seat_limit").eq("id",sub?.plan_id??"free").single();
    const [{count:memberCount},{count:inviteCount}]=await Promise.all([
      supabase.from("workspace_members").select("*",{count:"exact",head:true}).eq("workspace_id",workspace.id),
      supabase.from("workspace_invites").select("*",{count:"exact",head:true}).eq("workspace_id",workspace.id).is("accepted_at",null)
    ]);
    if(plan&&1+(memberCount??0)+(inviteCount??0)>=plan.seat_limit)return NextResponse.json({error:"Your plan's workspace seat limit has been reached. Upgrade to invite more teammates."},{status:402});
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data: invite, error } = await supabase.from("workspace_invites").insert({
      workspace_id: workspace.id, invited_email: email, role, token_hash: tokenHash, invited_by: user.id
    }).select("id,invited_email,role,expires_at,created_at").single();
    if (error) throw error;
    return NextResponse.json({ invite, inviteUrl: request.nextUrl.origin + "/login?invite=" + token });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create invitation." }, { status: 400 }); }
}
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json(), userId = String(body.userId ?? ""), role = String(body.role ?? "");
    if (!userId || !["admin", "member", "viewer"].includes(role)) return NextResponse.json({ error: "Invalid member or role." }, { status: 400 });
    const { data: workspace } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
    if (!workspace) return NextResponse.json({ error: "Only the workspace owner can change roles." }, { status: 403 });
    const { error } = await supabase.from("workspace_members").update({ role }).eq("workspace_id", workspace.id).eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update role." }, { status: 400 }); }
}
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = request.nextUrl.searchParams.get("userId"), inviteId = request.nextUrl.searchParams.get("inviteId");
  const { data: workspace } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
  if (!workspace) return NextResponse.json({ error: "Only the workspace owner can remove access." }, { status: 403 });
  const result = userId
    ? await supabase.from("workspace_members").delete().eq("workspace_id", workspace.id).eq("user_id", userId)
    : inviteId ? await supabase.from("workspace_invites").delete().eq("workspace_id", workspace.id).eq("id", inviteId) : null;
  if (!result) return NextResponse.json({ error: "Specify a member or invitation." }, { status: 400 });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
