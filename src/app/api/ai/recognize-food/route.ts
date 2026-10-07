import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated, externalFailure, signedImageUrl } from "@/lib/api";
import { recognizeFood } from "@/lib/ai/features";

const input=z.object({imagePath:z.string().min(5).max(500)});
export async function POST(request:Request){
  const auth=await authenticated("recognize-food",5); if("response" in auth)return auth.response;
  try{const parsed=input.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid image path"},{status:400});const url=await signedImageUrl("food-images",parsed.data.imagePath,auth.user.id,auth.supabase);return NextResponse.json(await recognizeFood(url));}catch(error){console.error("Food recognition failed",error instanceof Error?error.message:"unknown");return externalFailure("Food recognition failed. Try a clearer photo.");}
}
