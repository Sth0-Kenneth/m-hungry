import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated } from "@/lib/api";
const input=z.object({id:z.string().uuid().optional(),all:z.boolean().optional()}).refine((v)=>v.id||v.all);
export async function POST(request:Request){const auth=await authenticated("notification-read",30);if("response" in auth)return auth.response;const parsed=input.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid notification"},{status:400});let query=auth.supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",auth.user.id);if(parsed.data.id)query=query.eq("id",parsed.data.id);if(parsed.data.all)query=query.is("read_at",null);const {error}=await query;if(error)return NextResponse.json({error:"Could not update notification"},{status:500});return NextResponse.json({ok:true});}
