import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function authenticated(limitKey:string, limit=10) {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return {response:NextResponse.json({error:"Authentication required"},{status:401})} as const;
  if(!rateLimit(`${limitKey}:${user.id}`,limit,60_000)) return {response:NextResponse.json({error:"Too many requests. Try again shortly."},{status:429})} as const;
  return {user,supabase} as const;
}

export async function signedImageUrl(bucket:"receipts"|"food-images", path:string, userId:string, supabase:Awaited<ReturnType<typeof createClient>>) {
  if(!path.startsWith(`${userId}/`)) throw new Error("Invalid image path");
  const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,60);
  if(error) throw new Error("Image not found");
  return data.signedUrl;
}

export function externalFailure(message:string, status=502) {
  return NextResponse.json({error:message},{status});
}
