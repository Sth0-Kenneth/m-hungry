import { NextResponse } from "next/server";
import { authenticated, externalFailure } from "@/lib/api";
import { recipeRequestSchema } from "@/lib/validation";
import { generateRecipes } from "@/lib/ai/features";
import type { InventoryItem } from "@/lib/types";

export async function POST(request:Request){
 const auth=await authenticated("recipes",5);if("response" in auth)return auth.response;
 const parsed=recipeRequestSchema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid recipe preferences"},{status:400});
 const {data}=await auth.supabase.from("inventory_items").select("*").eq("user_id",auth.user.id).eq("status","available").gt("quantity",0).order("expiration_date",{ascending:true,nullsFirst:false}).limit(60);
 if(!data?.length)return NextResponse.json({error:"Add inventory items before generating recipes."},{status:400});
 try{const result=await generateRecipes(data as InventoryItem[],parsed.data);const saved=[];for(const recipe of result.recipes){const {data:row,error}=await auth.supabase.from("recipes").insert({user_id:auth.user.id,title:recipe.title,description:recipe.description,source_type:"ai_generated",cooking_time_minutes:recipe.cookingTimeMinutes,difficulty:recipe.difficulty,servings:recipe.servings,ingredients_json:{used:recipe.ingredientsUsed,missing:recipe.missingIngredients,mock:Boolean(result.mock)},steps_json:recipe.steps,safety_notes_json:recipe.safetyNotes}).select("id").single();if(!error&&row)saved.push({...recipe,id:row.id,mock:Boolean(result.mock)});}return NextResponse.json({recipes:saved,mock:Boolean(result.mock)});}catch(error){console.error("Recipe generation failed",error instanceof Error?error.message:"unknown");return externalFailure("Recipe generation failed. Try again.");}
}
