import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getGoogleAccessToken,getOwnedGoogleAccount,googleFetch,logActivity} from "@/lib/drive/google";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 let jobId:string|undefined;
 try{
  const body=await request.json(),sourceId=String(body.sourceAccountId??""),destinationId=String(body.destinationAccountId??""),fileId=String(body.fileId??"");
  if(!sourceId||!destinationId||!fileId||sourceId===destinationId)return NextResponse.json({error:"Choose a different destination drive."},{status:400});
  const [source,destination]=await Promise.all([getOwnedGoogleAccount(sourceId,user.id),getOwnedGoogleAccount(destinationId,user.id)]);
  const [sourceToken,destinationToken]=await Promise.all([getGoogleAccessToken(source),getGoogleAccessToken(destination)]);
  const metaResponse=await googleFetch(sourceToken,"/files/"+encodeURIComponent(fileId)+"?fields=id,name,mimeType,size,parents");const meta=await metaResponse.json();if(!metaResponse.ok)throw new Error("Source file could not be found.");
  if(meta.mimeType==="application/vnd.google-apps.folder")throw new Error("Folder transfers are not supported yet. Transfer individual files.");
  const size=Number(meta.size??0);if(size>20*1024*1024)throw new Error("Cross-drive transfer currently supports files up to 20 MB per operation.");
  const {data:job}=await supabase.from("storage_jobs").insert({owner_id:user.id,job_type:"copy",status:"running",source_account_id:sourceId,destination_account_id:destinationId,source_file_id:fileId,bytes_total:size,bytes_processed:0,started_at:new Date().toISOString()}).select("id").single();jobId=job?.id;
  const download=await googleFetch(sourceToken,"/files/"+encodeURIComponent(fileId)+"?alt=media");if(!download.ok)throw new Error("Could not read source file bytes.");
  const bytes=await download.arrayBuffer();
  const form=new FormData();form.append("metadata",new Blob([JSON.stringify({name:meta.name})],{type:"application/json"}));form.append("file",new Blob([bytes],{type:meta.mimeType||"application/octet-stream"}),meta.name);
  const upload=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,webViewLink",{method:"POST",headers:{authorization:"Bearer "+destinationToken},body:form,cache:"no-store"});const result=await upload.json();if(!upload.ok)throw new Error(result.error?.message??"Destination upload failed.");
  if(jobId)await supabase.from("storage_jobs").update({status:"completed",destination_file_id:result.id,bytes_processed:size,completed_at:new Date().toISOString()}).eq("id",jobId);
  await logActivity(user.id,"file_transferred","file",fileId,{name:meta.name,from:source.email,to:destination.email,destinationFileId:result.id});
  return NextResponse.json({success:true,file:result,jobId});
 }catch(e){if(jobId)await supabase.from("storage_jobs").update({status:"failed",error_code:"TRANSFER_FAILED",error_message:e instanceof Error?e.message:"Transfer failed.",completed_at:new Date().toISOString()}).eq("id",jobId);return NextResponse.json({error:e instanceof Error?e.message:"Transfer failed."},{status:400});}
}
