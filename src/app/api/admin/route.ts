import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime="nodejs";
const forbidden=(message:string)=>NextResponse.json({error:message},{status:/admin access/i.test(message)?403:400});
export async function GET(req:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const view=req.nextUrl.searchParams.get("view")||"overview";
 const q=req.nextUrl.searchParams.get("q")||"";
 const calls:Record<string,()=>Promise<any>>={
  overview:()=>db.rpc("admin_dashboard_snapshot"),
  users:async()=>{const [u,s]=await Promise.all([db.rpc("admin_list_users",{search_term:q}),db.rpc("admin_dashboard_snapshot")]);if(u.error)return u;if(s.error)return s;return {data:{users:u.data,plans:s.data?.plans||[]},error:null};},
  accounts:()=>db.rpc("admin_list_accounts",{search_term:q}),
  files:()=>db.rpc("admin_list_files",{search_term:q}),
  jobs:()=>db.rpc("admin_list_jobs"),
  billing:()=>db.rpc("admin_list_billing"),
  tickets:()=>db.rpc("admin_list_support_tickets")
 };
 if(!calls[view])return NextResponse.json({error:"Unknown admin view."},{status:400});
 const {data,error}=await calls[view]();if(error)return forbidden(error.message);
 return NextResponse.json({data});
}
export async function PATCH(req:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 try{
  const b=await req.json();let result:any;
  if(b.action==="subscription")result=await db.rpc("admin_update_subscription",{target_user_id:String(b.userId),target_plan_id:String(b.planId),target_status:String(b.status)});
  else if(b.action==="ticket")result=await db.rpc("admin_update_ticket",{ticket_id:String(b.ticketId),next_status:String(b.status),next_priority:b.priority?String(b.priority):null});
  else if(b.action==="notification")result=await db.rpc("admin_send_notification",{target_user_id:String(b.userId),notification_title:String(b.title),notification_body:String(b.body),notification_category:"admin"});
  else return NextResponse.json({error:"Unknown admin action."},{status:400});
  if(result.error)return forbidden(result.error.message);
  return NextResponse.json({data:result.data});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid admin request."},{status:400});}
}
