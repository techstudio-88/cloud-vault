import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getGoogleAccessToken,getOwnedGoogleAccount,googleFetch} from "@/lib/drive/google";
export const runtime="nodejs";
const nativeExports:Record<string,{mime:string;ext:string}>={
 "application/vnd.google-apps.document":{mime:"application/pdf",ext:".pdf"},
 "application/vnd.google-apps.spreadsheet":{mime:"text/csv",ext:".csv"},
 "application/vnd.google-apps.presentation":{mime:"application/pdf",ext:".pdf"},
 "application/vnd.google-apps.drawing":{mime:"application/pdf",ext:".pdf"}
};
export async function GET(request:NextRequest){
 try{
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const p=request.nextUrl.searchParams,account=await getOwnedGoogleAccount(p.get("accountId")??"",user.id),fileId=p.get("fileId");if(!fileId)return NextResponse.json({error:"Missing file."},{status:400});
  const token=await getGoogleAccessToken(account),meta=await googleFetch(token,"/files/"+encodeURIComponent(fileId)+"?fields=name,mimeType");
  const info=await meta.json();if(!meta.ok)throw new Error("Could not read file metadata.");
  const exportType=nativeExports[info.mimeType],path=exportType?"/files/"+encodeURIComponent(fileId)+"/export?mimeType="+encodeURIComponent(exportType.mime):"/files/"+encodeURIComponent(fileId)+"?alt=media";
  const response=await googleFetch(token,path);if(!response.ok)throw new Error("Could not download or export this file.");
  const bytes=await response.arrayBuffer(),safeName=String(info.name??"download").replace(/[\\r\\n"]/g,"_")+(exportType?.ext??"");
  return new NextResponse(bytes,{headers:{"content-type":exportType?.mime??info.mimeType??"application/octet-stream","content-disposition":'attachment; filename="'+safeName+'"',"cache-control":"private, no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Download failed."},{status:400});}
}
