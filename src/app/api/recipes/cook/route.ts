import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated } from "@/lib/api";
const input=z.object({items:z.array(z.object({inventoryItemId:z.string().uuid(),quantity:z.number().positive(),unit:z.string().min(1).max(30)})).min(1).max(30)});
export async function POST(request:Request){const auth=await authenticated("cook",10);if("response" in auth)return auth.response;const parsed=input.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid ingredient quantities"},{status:400});const {error}=await auth.supabase.rpc("record_recipe_usage",{p_items:parsed.data.items});if(error)return NextResponse.json({error:"Could not update inventory. Check available quantities."},{status:409});return NextResponse.json({ok:true});}
