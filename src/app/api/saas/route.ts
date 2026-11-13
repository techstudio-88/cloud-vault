import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime="nodejs";
export async function GET(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 let {data:sub}=await db.from("user_subscriptions").select("*").eq("owner_id",user.id).maybeSingle();
 if(!sub){const {data,error}=await db.from("user_subscriptions").insert({owner_id:user.id,plan_id:"free",status:"active"}).select("*").single();if(error)return NextResponse.json({error:error.message}, {status:400});sub=data;}
 const [{data:plans,error:pe},{data:accounts},{data:workspace},{data:billing}] = await Promise.all([
  db.from("subscription_plans").select("*").eq("is_active",true).order("storage_limit_bytes"),
  db.from("connected_accounts").select("id,storage_used_bytes").eq("owner_id",user.id).eq("status","connected"),
  db.from("workspaces").select("id").eq("owner_id",user.id).maybeSingle(),
  db.from("billing_records").select("id,plan_id,amount_inr,currency,status,billing_period,description,created_at,paid_at").eq("owner_id",user.id).order("created_at",{ascending:false}).limit(20)
 ]);
 if(pe)return NextResponse.json({error:pe.message},{status:400});
 let seats=1;if(workspace?.id){const {count}=await db.from("workspace_members").select("*",{count:"exact",head:true}).eq("workspace_id",workspace.id);seats=1+(count??0);}
 const plan=(plans??[]).find(p=>p.id===sub.plan_id)??(plans??[]).find(p=>p.id==="free");
 return NextResponse.json({subscription:sub,plan,plans:plans??[],usage:{storageBytes:(accounts??[]).reduce((n,a)=>n+Number(a.storage_used_bytes??0),0),connectedAccounts:accounts?.length??0,seats},billing:billing??[]});
}
export async function POST(req:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 try{
  const body=await req.json();const planId=String(body.planId??"");const cycle=body.billingCycle==="yearly"?"yearly":"monthly";
  const {data:plan,error:planError}=await db.from("subscription_plans").select("*").eq("id",planId).eq("is_active",true).single();
  if(planError||!plan)return NextResponse.json({error:"Choose an available plan."},{status:400});
  const {data:current}=await db.from("user_subscriptions").select("*").eq("owner_id",user.id).maybeSingle();
  if(plan.id==="free"){
   const {data:sub,error}=await db.from("user_subscriptions").upsert({owner_id:user.id,plan_id:"free",status:"active",billing_cycle:"monthly",updated_at:new Date().toISOString()},{onConflict:"owner_id"}).select("*").single();
   if(error)throw error;
   return NextResponse.json({subscription:sub,message:"Free plan activated."});
  }
  const price=cycle==="yearly"?plan.yearly_price_inr:plan.monthly_price_inr;
  if(price==null || Number(price)<=0)return NextResponse.json({error:"This plan is not available for paid checkout yet."},{status:400});
  const {data:record,error:billingError}=await db.from("billing_records").insert({owner_id:user.id,subscription_id:current?.id??null,plan_id:plan.id,amount_inr:price,currency:"INR",status:"pending",billing_period:cycle,description:"Upgrade request: "+plan.name+" ("+cycle+")"}).select("*").single();
  if(billingError)throw billingError;
  await db.from("user_notifications").insert({owner_id:user.id,title:"Upgrade request received",body:"Your request for the "+plan.name+" plan has been recorded. Paid features remain locked until payment verification.",category:"billing"});
  return NextResponse.json({subscription:current,billingRecord:record,message:"Upgrade request recorded. Your current plan remains active until a verified payment is received."});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not update subscription."},{status:400});}
}
