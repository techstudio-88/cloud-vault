import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getGoogleAccessToken,getOwnedGoogleAccount} from "@/lib/drive/google";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const body=await request.json(),accountId=String(body.accountId??""),name=String(body.name??"").trim(),mimeType=String(body.mimeType??"application/octet-stream"),size=Number(body.size??0),parentId=String(body.parentId??"root");
  if(!accountId||!name||!Number.isSafeInteger(size)||size<=0)return NextResponse.json({error:"Choose a drive and a valid file."},{status:400});
  const {data:subscription}=await supabase.from("user_subscriptions").select("plan_id,status").eq("owner_id",user.id).maybeSingle();
  const planId=subscription?.plan_id??"free";
  const {data:plan}=await supabase.from("subscription_plans").select("storage_limit_bytes").eq("id",planId).single();
  const {data:usageAccounts}=await supabase.from("connected_accounts").select("storage_used_bytes").eq("owner_id",user.id).eq("status","connected");
  const used=(usageAccounts??[]).reduce((n,a)=>n+Number(a.storage_used_bytes??0),0);
  if(plan&&used+size>Number(plan.storage_limit_bytes))return NextResponse.json({error:"Your CloudVault plan storage allowance has been reached. Upgrade your plan to continue."},{status:402});
  const account=await getOwnedGoogleAccount(accountId,user.id),token=await getGoogleAccessToken(account);
  const response=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,modifiedTime,webViewLink,parents",{method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json; charset=UTF-8","x-upload-content-type":mimeType,"x-upload-content-length":String(size)},body:JSON.stringify({name,...(parentId!=="root"?{parents:[parentId]}:{})}),cache:"no-store"});
  const uploadUrl=response.headers.get("location");if(!response.ok||!uploadUrl)throw new Error("Google Drive could not start a resumable upload.");
  const {data:workspace}=await supabase.from("workspaces").select("id").eq("owner_id",user.id).limit(1).maybeSingle();
  const {data:job,error}=await supabase.from("storage_jobs").insert({owner_id:user.id,workspace_id:workspace?.id??null,job_type:"upload",status:"running",source_account_id:accountId,bytes_total:size,bytes_processed:0,started_at:new Date().toISOString(),provider_upload_url:uploadUrl,file_name:name,file_mime_type:mimeType,parent_provider_file_id:parentId==="root"?null:parentId}).select("id").single();
  if(error||!job)throw new Error("Could not create the upload job.");
  return NextResponse.json({jobId:job.id,chunkSize:4*1024*1024});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not start upload."},{status:400});}
}
