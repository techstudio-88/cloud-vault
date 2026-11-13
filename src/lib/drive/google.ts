import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export type DriveAccount = {
  id: string; owner_id: string; provider: string; email: string | null;
  display_name: string | null; token_ciphertext: string; token_iv: string;
  token_auth_tag: string; token_expires_at: string | null;
};

function key() {
  const raw=process.env.TOKEN_ENCRYPTION_KEY;
  if(!raw || !/^[a-f0-9]{64}$/i.test(raw)) throw new Error("CloudVault token encryption is not configured.");
  return Buffer.from(raw,"hex");
}
export function encryptTokenBundle(value: string) {
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key(),iv);
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return {token_ciphertext:encrypted.toString("base64"),token_iv:iv.toString("base64"),token_auth_tag:cipher.getAuthTag().toString("base64")};
}
function decryptTokenBundle(account: DriveAccount) {
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(account.token_iv,"base64"));
  decipher.setAuthTag(Buffer.from(account.token_auth_tag,"base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(account.token_ciphertext,"base64")),decipher.final()]).toString("utf8")) as {access_token:string;refresh_token:string;scope?:string};
}
export async function getGoogleAccessToken(account: DriveAccount) {
  const bundle=decryptTokenBundle(account);
  if(account.token_expires_at && new Date(account.token_expires_at).getTime()>Date.now()+90_000) return bundle.access_token;
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID??"",client_secret:process.env.GOOGLE_CLIENT_SECRET??"",refresh_token:bundle.refresh_token,grant_type:"refresh_token"}),cache:"no-store"});
  const refreshed=await response.json();
  if(!response.ok || !refreshed.access_token) throw new Error("Google Drive authorization expired. Reconnect this account.");
  const next={...bundle,access_token:refreshed.access_token,scope:refreshed.scope??bundle.scope};
  const supabase=await createClient();
  const encrypted=encryptTokenBundle(JSON.stringify(next));
  const {error}=await supabase.from("connected_accounts").update({...encrypted,token_expires_at:new Date(Date.now()+Number(refreshed.expires_in??3600)*1000).toISOString(),updated_at:new Date().toISOString()}).eq("id",account.id).eq("owner_id",account.owner_id);
  if(error) throw new Error("Could not refresh the connected account securely.");
  return refreshed.access_token as string;
}
export async function getOwnedGoogleAccount(accountId:string,userId:string) {
  const supabase=await createClient();
  const {data,error}=await supabase.from("connected_accounts").select("id,owner_id,provider,email,display_name,token_ciphertext,token_iv,token_auth_tag,token_expires_at").eq("id",accountId).eq("owner_id",userId).eq("provider","google_drive").eq("status","connected").maybeSingle();
  if(error || !data) throw new Error("Connected Google Drive account not found.");
  if(!data.token_ciphertext || !data.token_iv || !data.token_auth_tag) throw new Error("Reconnect this Google Drive account to enable file operations.");
  return data as DriveAccount;
}
export async function googleFetch(token:string,path:string,init:RequestInit={}) {
  const response=await fetch("https://www.googleapis.com/drive/v3"+path,{...init,headers:{authorization:"Bearer "+token,...(init.headers??{})},cache:"no-store"});
  if(response.status===401) throw new Error("Google Drive authorization expired. Reconnect this account.");
  return response;
}
export async function logActivity(ownerId:string,action:string,resourceType:string,resourceId:string|null,details:Record<string,unknown>={}) {
  const supabase=await createClient();
  await supabase.from("activity_logs").insert({owner_id:ownerId,actor_user_id:ownerId,action,resource_type:resourceType,resource_id:resourceId,details});
}
