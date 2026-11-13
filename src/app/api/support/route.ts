import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 try{const b=await req.json();const {data,error}=await db.rpc("support_create_ticket",{ticket_subject:String(b.subject||""),ticket_message:String(b.message||""),ticket_priority:String(b.priority||"normal")});if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ticket:data},{status:201});}
 catch{return NextResponse.json({error:"Invalid support request."},{status:400});}
}