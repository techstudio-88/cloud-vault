import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getGoogleAccessToken,getOwnedGoogleAccount} from "@/lib/drive/google";
export const runtime="nodejs";
export async function PUT(request:NextRequest){
 let jobId="";
 try{
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  jobId=request.headers.get("x-upload-job-id")??"";if(!jobId)return NextResponse.json({error:"Missing upload job."},{status:400});
  const {data:job,error}=await supabase.from("storage_jobs").select("id,owner_id,source_account_id,provider_upload_url,bytes_total,bytes_processed,file_name,file_mime_type,parent_provider_file_id,status").eq("id",jobId).eq("owner_id",user.id).single();
  if(error||!job||job.status!=="running"||!job.provider_upload_url)return NextResponse.json({error:"Upload session not found or no longer active."},{status:404});
  const range=request.headers.get("content-range")??"",match=range.match(/^bytes (\d+)-(\d+)\/(\d+)$/);if(!match)return NextResponse.json({error:"Invalid Content-Range."},{status:400});
  const start=Number(match[1]),end=Number(match[2]),total=Number(match[3]),bytes=await request.arrayBuffer();
  if(start!==Number(job.bytes_processed??0)||total!==Number(job.bytes_total)||end-start+1!==bytes.byteLength||bytes.byteLength>4*1024*1024)return NextResponse.json({error:"Chunk range does not match the current upload position."},{status:400});
  const account=await getOwnedGoogleAccount(job.source_account_id,user.id),token=await getGoogleAccessToken(account);
  const response=await fetch(job.provider_upload_url,{method:"PUT",headers:{authorization:"Bearer "+token,"content-length":String(bytes.byteLength),"content-range":range},body:bytes,cache:"no-store"});
  if(response.status===308){const next=end+1;await supabase.from("storage_jobs").update({bytes_processed:next}).eq("id",jobId).eq("owner_id",user.id);return NextResponse.json({done:false,bytesProcessed:next});}
  const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error?.message??"Google Drive rejected an upload chunk.");
  const {data:workspace}=await supabase.from("workspaces").select("id").eq("owner_id",user.id).limit(1).maybeSingle();
  await supabase.from("storage_jobs").update({status:"completed",bytes_processed:total,destination_file_id:result.id,completed_at:new Date().toISOString(),provider_upload_url:null}).eq("id",jobId).eq("owner_id",user.id);
  await supabase.from("file_metadata").upsert({owner_id:user.id,workspace_id:workspace?.id??null,connected_account_id:job.source_account_id,provider_file_id:result.id,parent_provider_file_id:job.parent_provider_file_id,name:result.name??job.file_name,mime_type:result.mimeType??job.file_mime_type,size_bytes:Number(result.size??total),is_folder:false,trashed:false,modified_at:result.modifiedTime??new Date().toISOString(),web_view_url:result.webViewLink??null,synced_at:new Date().toISOString()},{onConflict:"connected_account_id,provider_file_id"});
  await supabase.from("activity_logs").insert({owner_id:user.id,actor_user_id:user.id,action:"file_uploaded",resource_type:"file",resource_id:result.id,details:{name:result.name??job.file_name,size:total}});
  return NextResponse.json({done:true,bytesProcessed:total,file:result});
 }catch(e){
  if(jobId){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(user)await supabase.from("storage_jobs").update({status:"failed",error_code:"UPLOAD_FAILED",error_message:e instanceof Error?e.message:"Upload failed.",completed_at:new Date().toISOString(),provider_upload_url:null}).eq("id",jobId).eq("owner_id",user.id);}
  return NextResponse.json({error:e instanceof Error?e.message:"Upload failed."},{status:400});
 }
}
