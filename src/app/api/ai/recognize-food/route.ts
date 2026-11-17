import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated, externalFailure, signedImageUrl } from "@/lib/api";
import { recognizeFood } from "@/lib/ai/features";
import { getLocale } from "@/lib/i18n/server";

const input=z.object({imagePath:z.string().min(5).max(500)});
export async function POST(request:Request){
  const auth=await authenticated("recognize-food",5,{ai:true}); if("response" in auth)return auth.response;
  try{const parsed=input.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid image path"},{status:400});const [url,locale]=await Promise.all([signedImageUrl("food-images",parsed.data.imagePath,auth.user.id,auth.supabase),getLocale()]);return NextResponse.json(await recognizeFood(url,locale));}catch(error){console.error("Food recognition failed",error instanceof Error?error.message:"unknown");return externalFailure("Food recognition failed. Try a clearer photo.");}
}
