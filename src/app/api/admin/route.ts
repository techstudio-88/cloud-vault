import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const view=req.nextUrl.searchParams.get("view")||"overview";
 const call=view==="users"?db.rpc("admin_list_users",{search_term:req.nextUrl.searchParams.get("q")||""}):view==="tickets"?db.rpc("admin_list_support_tickets"):db.rpc("admin_dashboard_snapshot");
 const {data,error}=await call;if(error)return NextResponse.json({error:error.message},{status:/admin access/i.test(error.message)?403:400});
 return NextResponse.json({data});
}
export async function PATCH(req:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 try{const b=await req.json();const result=b.action==="subscription"?await db.rpc("admin_update_subscription",{target_user_id:String(b.userId),target_plan_id:String(b.planId),target_status:String(b.status)}):b.action==="ticket"?await db.rpc("admin_update_ticket",{ticket_id:String(b.ticketId),next_status:String(b.status),next_priority:b.priority?String(b.priority):null}):null;
 if(!result)return NextResponse.json({error:"Unknown admin action."},{status:400});
 if(result.error)return NextResponse.json({error:result.error.message},{status:400});
 return NextResponse.json({data:result.data});
 }catch{return NextResponse.json({error:"Invalid admin request."},{status:400});}
}
