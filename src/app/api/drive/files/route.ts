import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAccessToken,getOwnedGoogleAccount,googleFetch,logActivity } from "@/lib/drive/google";

export const runtime="nodejs";
const fields="files(id,name,mimeType,size,modifiedTime,webViewLink,parents,thumbnailLink,iconLink,trashed),nextPageToken";
export async function GET(request:NextRequest) {
  try {
    const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:"Sign in required."},{status:401});
    const params=request.nextUrl.searchParams,accountId=params.get("accountId");
    if(!accountId) return NextResponse.json({error:"Choose a connected drive."},{status:400});
    const account=await getOwnedGoogleAccount(accountId,user.id),token=await getGoogleAccessToken(account);
    const q=params.get("q")?.trim(),folder=params.get("folderId");
    let driveQuery=folder?"trashed = false":"trashed = false and 'root' in parents";
    if(folder) driveQuery+=` and '${folder.replace(/['\\]/g,"\\$&")}' in parents`;
    if(q) driveQuery+=` and name contains '${q.replace(/['\\]/g,"\\$&")}'`;
    const url=new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q",driveQuery);url.searchParams.set("fields",fields);url.searchParams.set("pageSize","100");url.searchParams.set("orderBy","folder,name");url.searchParams.set("supportsAllDrives","true");url.searchParams.set("includeItemsFromAllDrives","true");
    const page=params.get("pageToken");if(page)url.searchParams.set("pageToken",page);
    const response=await fetch(url,{headers:{authorization:"Bearer "+token},cache:"no-store"});
    const payload=await response.json();if(!response.ok) return NextResponse.json({error:payload.error?.message??"Could not list Google Drive files."},{status:response.status});
    const files=(payload.files??[]).map((f:{id:string;name:string;mimeType:string;size?:string;modifiedTime?:string;webViewLink?:string;parents?:string[];thumbnailLink?:string;iconLink?:string;trashed?:boolean})=>({...f,size:Number(f.size??0),isFolder:f.mimeType==="application/vnd.google-apps.folder"}));
    const quotaResponse=await fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota,user",{headers:{authorization:"Bearer "+token},cache:"no-store"});
    const about=quotaResponse.ok?await quotaResponse.json():{};
    const quota=about.storageQuota??{};
    if(quotaResponse.ok) await supabase.from("connected_accounts").update({storage_used_bytes:quota.usage?Number(quota.usage):null,storage_total_bytes:quota.limit?Number(quota.limit):null,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",account.id).eq("owner_id",user.id);
    const {data:workspace}=await supabase.from("workspaces").select("id").eq("owner_id",user.id).limit(1).maybeSingle();
    if(files.length) await supabase.from("file_metadata").upsert(files.map((f:any)=>({owner_id:user.id,workspace_id:workspace?.id??null,connected_account_id:account.id,provider_file_id:f.id,parent_provider_file_id:f.parents?.[0]??null,name:f.name,mime_type:f.mimeType,size_bytes:f.size,is_folder:f.isFolder,trashed:false,modified_at:f.modifiedTime??null,web_view_url:f.webViewLink??null,synced_at:new Date().toISOString()})),{onConflict:"connected_account_id,provider_file_id"});
    await supabase.from("connected_accounts").update({last_synced_at:new Date().toISOString()}).eq("id",account.id);
    return NextResponse.json({files,nextPageToken:payload.nextPageToken??null,storageQuota:quota,account:{id:account.id,email:account.email,name:account.display_name}});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Could not load files."},{status:400}); }
}
export async function POST(request:NextRequest) {
  try {
    const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
    const form=await request.formData(),accountId=String(form.get("accountId")??""),parentId=String(form.get("parentId")??"root"),file=form.get("file"),folderName=String(form.get("folderName")??"").trim();
    if(!accountId)return NextResponse.json({error:"Choose a destination drive."},{status:400});
    const account=await getOwnedGoogleAccount(accountId,user.id),token=await getGoogleAccessToken(account);
    if(folderName) {
      const response=await googleFetch(token,"/files",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:folderName,mimeType:"application/vnd.google-apps.folder",...(parentId!=="root"?{parents:[parentId]}:{})})});
      const data=await response.json();if(!response.ok)throw new Error(data.error?.message??"Folder creation failed.");
      await logActivity(user.id,"folder_created","file",data.id,{name:folderName,account:account.email});
      return NextResponse.json({file:data});
    }
    if(!(file instanceof File))return NextResponse.json({error:"Select a file to upload."},{status:400});
    if(file.size>4*1024*1024)return NextResponse.json({error:"This server upload supports files up to 4 MB. Large-file resumable uploads are being added next."},{status:413});
    const metadata={name:file.name,...(parentId!=="root"?{parents:[parentId]}:{})};
    const body=new FormData();body.append("metadata",new Blob([JSON.stringify(metadata)],{type:"application/json"}));body.append("file",file,file.name);
    const response=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,parents",{method:"POST",headers:{authorization:"Bearer "+token},body,cache:"no-store"});
    const data=await response.json();if(!response.ok)throw new Error(data.error?.message??"Upload failed.");
    await logActivity(user.id,"file_uploaded","file",data.id,{name:file.name,size:file.size,account:account.email});
    return NextResponse.json({file:data});
  } catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload failed."},{status:400});}
}
export async function PATCH(request:NextRequest) {
  try {
    const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
    const body=await request.json(),account=await getOwnedGoogleAccount(String(body.accountId??""),user.id),token=await getGoogleAccessToken(account),fileId=String(body.fileId??"");
    if(!fileId)return NextResponse.json({error:"Missing file."},{status:400});
    let response:Response;
    if(body.action==="rename") response=await googleFetch(token,"/files/"+encodeURIComponent(fileId),{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({name:String(body.name??"").slice(0,250)})});
    else if(body.action==="move") {
      const meta=await googleFetch(token,"/files/"+encodeURIComponent(fileId)+"?fields=parents");
      const current=await meta.json();const remove=(current.parents??[]).join(",");
      const url=new URL("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId));if(remove)url.searchParams.set("removeParents",remove);if(body.parentId&&body.parentId!=="root")url.searchParams.set("addParents",String(body.parentId));
      response=await fetch(url,{method:"PATCH",headers:{authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify({})});
    } else return NextResponse.json({error:"Unsupported file action."},{status:400});
    const data=await response.json();if(!response.ok)throw new Error(data.error?.message??"File update failed.");
    await logActivity(user.id,body.action==="rename"?"file_renamed":"file_moved","file",fileId,{name:data.name??body.name});
    return NextResponse.json({file:data});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"File update failed."},{status:400});}
}
export async function DELETE(request:NextRequest) {
  try {
    const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
    const account=await getOwnedGoogleAccount(request.nextUrl.searchParams.get("accountId")??"",user.id),fileId=request.nextUrl.searchParams.get("fileId");if(!fileId)return NextResponse.json({error:"Missing file."},{status:400});
    const token=await getGoogleAccessToken(account),response=await googleFetch(token,"/files/"+encodeURIComponent(fileId),{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({trashed:true})});
    if(!response.ok)throw new Error("Could not move this file to Google Drive trash.");
    await supabase.from("file_metadata").update({trashed:true}).eq("connected_account_id",account.id).eq("provider_file_id",fileId);
    await logActivity(user.id,"file_trashed","file",fileId,{account:account.email});
    return NextResponse.json({success:true});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Delete failed."},{status:400});}
}
