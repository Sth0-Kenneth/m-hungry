import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated } from "@/lib/api";
const input=z.object({reminderDays:z.array(z.union([z.literal(0),z.literal(1),z.literal(3),z.literal(7)])).min(1),preferredCookingTime:z.number().int().min(5).max(360)});
export async function POST(request:Request){const auth=await authenticated("notification-preferences",10);if("response" in auth)return auth.response;const parsed=input.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid preferences"},{status:400});const {error}=await auth.supabase.from("user_settings").update({reminder_days:[...new Set(parsed.data.reminderDays)],preferred_cooking_time:parsed.data.preferredCookingTime,updated_at:new Date().toISOString()}).eq("user_id",auth.user.id);if(error)return NextResponse.json({error:"Could not save preferences"},{status:500});return NextResponse.json({ok:true});}
