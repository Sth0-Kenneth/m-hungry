import "server-only";
import type { InventoryItem, RecipeDraft, WebRecipeResult } from "@/lib/types";
import { foodRecognitionSchema, expirationRecognitionSchema, recipesResponseSchema, webRecipeResponseSchema } from "@/lib/validation";
import { groundedSearch, structuredResponse } from "./client";
import { serverEnv } from "@/lib/server-env";
import {
  expirationExtractionPrompt,
  foodRecognitionPrompt,
  recipeGenerationPrompt,
  recipeSearchPrompt,
} from "./prompts";

const object = (properties:Record<string,unknown>, required:string[]) => ({type:"object",additionalProperties:false,properties,required});
const nullableString={anyOf:[{type:"string"},{type:"null"}]};

export async function recognizeFood(imageUrl:string) {
  if(serverEnv.USE_MOCK_AI==="true") return {mock:true,items:[{name:"Bananas",category:"Produce",estimatedQuantity:5,unit:"pieces",confidence:.91},{name:"Apples",category:"Produce",estimatedQuantity:3,unit:"pieces",confidence:.82}]};
  return structuredResponse({name:"food_recognition",schema:foodRecognitionSchema,jsonSchema:object({items:{type:"array",minItems:1,items:object({name:{type:"string"},category:nullableString,estimatedQuantity:{type:"number",exclusiveMinimum:0},unit:{type:"string"},confidence:{type:"number",minimum:0,maximum:1}},["name","category","estimatedQuantity","unit","confidence"])}},["items"]),instructions:foodRecognitionPrompt,userText:"Identify the food items in this image for an editable household inventory.",imageUrl});
}

export async function readExpiration(imageUrl:string) {
  if(serverEnv.USE_MOCK_AI==="true") return {mock:true,dates:[{value:new Date(Date.now()+7*86400000).toISOString().slice(0,10),label:"Best before",confidence:.94,yearMissing:false,suggestedYear:null,nearbyText:"賞味期限"}]};
  return structuredResponse({name:"expiration_dates",schema:expirationRecognitionSchema,jsonSchema:object({dates:{type:"array",items:object({value:nullableString,label:nullableString,confidence:{type:"number",minimum:0,maximum:1},yearMissing:{type:"boolean"},suggestedYear:{anyOf:[{type:"integer",minimum:2000,maximum:2200},{type:"null"}]},nearbyText:nullableString},["value","label","confidence","yearMissing","suggestedYear","nearbyText"])}},["dates"]),instructions:expirationExtractionPrompt,userText:"Read possible expiration or best-before dates from this package label.",imageUrl});
}

export async function generateRecipes(inventory:InventoryItem[], preferences:{maxCookingTime:number;difficulty:string;servings:number;dietaryPreferences:string;allergies:string;excludeIngredients:string}) {
  if(serverEnv.USE_MOCK_AI==="true") return {mock:true,recipes:[{title:"Quick vegetable egg bowl",description:"A fast bowl that uses produce needing attention.",difficulty:"Easy",cookingTimeMinutes:20,servings:preferences.servings,ingredientsUsed:inventory.slice(0,3).map((item)=>({name:item.name,quantity:Math.min(Number(item.quantity),1),unit:item.unit,inventoryItemId:item.id,available:true})),missingIngredients:[{name:"Soy sauce",quantity:2,unit:"tbsp",available:false}],steps:["Prepare the vegetables.","Cook until tender.","Add egg and cook thoroughly.","Serve immediately."],safetyNotes:["Cook eggs until safely set and check allergens."],mock:true} satisfies RecipeDraft]};
  const inventoryPayload=inventory.map(({id,name,quantity,unit,expiration_date})=>({id,name,quantity,unit,expiration_date}));
  const ingredient=object({name:{type:"string"},quantity:{type:"number",exclusiveMinimum:0},unit:{type:"string"},inventoryItemId:{anyOf:[{type:"string"},{type:"null"}]},available:{type:"boolean"}},["name","quantity","unit","inventoryItemId","available"]);
  return structuredResponse({name:"inventory_recipes",schema:recipesResponseSchema,jsonSchema:object({recipes:{type:"array",minItems:1,maxItems:5,items:object({title:{type:"string"},description:{type:"string"},difficulty:{type:"string",enum:["Easy","Medium","Hard"]},cookingTimeMinutes:{type:"integer",minimum:1,maximum:360},servings:{type:"integer",minimum:1,maximum:20},ingredientsUsed:{type:"array",items:ingredient},missingIngredients:{type:"array",items:ingredient},steps:{type:"array",minItems:1,items:{type:"string"}},safetyNotes:{type:"array",items:{type:"string"}}},["title","description","difficulty","cookingTimeMinutes","servings","ingredientsUsed","missingIngredients","steps","safetyNotes"])}},["recipes"]),instructions:recipeGenerationPrompt,userText:`Inventory: ${JSON.stringify(inventoryPayload)}\nPreferences: ${JSON.stringify(preferences)}`});
}

export async function searchRecipes(inventory:InventoryItem[], query:string):Promise<{results:WebRecipeResult[];mock?:boolean}> {
  if(serverEnv.USE_MOCK_AI==="true") return {mock:true,results:[{title:"Easy pantry vegetable soup",sourceDomain:"example.com",sourceUrl:"https://example.com/vegetable-soup",summary:"A flexible soup using common vegetables and pantry staples.",ingredientsHighlighted:inventory.slice(0,3).map((item)=>item.name),mock:true}]};
  const available=inventory.map((item)=>item.name);
  const grounded=await groundedSearch(`Find direct recipe article pages for: ${query}. Prioritize recipes using these available ingredients: ${available.join(", ")}. Give several distinct original sources.`);
  if(!grounded.sources.length) throw new Error("Gemini search returned no cited recipe sources");
  const summarized=await structuredResponse({name:"web_recipes",schema:webRecipeResponseSchema,jsonSchema:object({results:{type:"array",maxItems:8,items:object({title:{type:"string"},sourceDomain:{type:"string"},sourceUrl:{type:"string"},summary:{type:"string"},ingredientsHighlighted:{type:"array",items:{type:"string"}}},["title","sourceDomain","sourceUrl","summary","ingredientsHighlighted"])}},["results"]),instructions:`${recipeSearchPrompt} Use only the exact cited source URLs supplied by the application.`,userText:`Search response: ${grounded.text}\nCited sources: ${JSON.stringify(grounded.sources)}\nAvailable ingredients: ${available.join(", ")}.`});
  const allowed=new Map(grounded.sources.map((source)=>[source.url,source]));
  const results=summarized.results.flatMap((result)=>{const source=allowed.get(result.sourceUrl);if(!source)return [];const domain=new URL(source.url).hostname.replace(/^www\./,"");return [{...result,sourceUrl:source.url,sourceDomain:domain,title:result.title||source.title}];});
  if(results.length)return {results};
  return {results:grounded.sources.map((source)=>({title:source.title,sourceUrl:source.url,sourceDomain:new URL(source.url).hostname.replace(/^www\./,""),summary:grounded.text.slice(0,600)||"A Gemini-grounded recipe source using relevant ingredients.",ingredientsHighlighted:available.slice(0,5)}))};
}
