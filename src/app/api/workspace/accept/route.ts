import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in with the invited email first." }, { status: 401 });
  try {
    const { token } = await request.json();
    if (typeof token !== "string" || token.length < 32 || token.length > 200) return NextResponse.json({ error: "Invalid invitation link." }, { status: 400 });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data, error } = await supabase.rpc("accept_workspace_invite", { p_token_hash: tokenHash });
    if (error) throw error;
    return NextResponse.json({ success: true, workspaceId: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not accept invitation." }, { status: 400 });
  }
}
