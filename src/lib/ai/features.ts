import "server-only";
import type { InventoryItem, RecipeDraft, WebRecipeResult } from "@/lib/types";
import type { Locale } from "@/lib/i18n/dictionaries";
import { foodRecognitionSchema, expirationRecognitionSchema, recipesResponseSchema, webRecipeResponseSchema } from "@/lib/validation";
import { normalizeInventoryMeasurement } from "@/lib/business/units";
import { reconcileRecipeInventory } from "@/lib/business/recipes";
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

export async function recognizeFood(imageUrl:string, locale:Locale="en") {
  const result = serverEnv.USE_MOCK_AI==="true"
    ? {mock:true,items:locale==="ja"
      ? [{name:"バナナ",category:"Produce",estimatedQuantity:5,unit:"個",confidence:.91},{name:"りんご",category:"Produce",estimatedQuantity:3,unit:"個",confidence:.82}]
      : [{name:"Bananas",category:"Produce",estimatedQuantity:5,unit:"pieces",confidence:.91},{name:"Apples",category:"Produce",estimatedQuantity:3,unit:"pieces",confidence:.82}]}
    : await structuredResponse({name:"food_recognition",schema:foodRecognitionSchema,jsonSchema:object({items:{type:"array",minItems:1,items:object({name:{type:"string"},category:nullableString,estimatedQuantity:{type:"number",exclusiveMinimum:0},unit:{type:"string"},confidence:{type:"number",minimum:0,maximum:1}},["name","category","estimatedQuantity","unit","confidence"])}},["items"]),instructions:`${foodRecognitionPrompt} Return item names in ${locale==="ja"?"Japanese":"English"}. Keep categories as canonical English grocery categories. For liquids use litres (リットル in Japanese) and convert visible mL amounts to litres. For bread and cake use slices (枚 in Japanese).`,userText:"Identify the food items in this image for an editable household inventory.",imageUrl});
  return {
    ...result,
    items: result.items.map((item) => {
      const normalized = normalizeInventoryMeasurement({name:item.name,category:item.category,quantity:item.estimatedQuantity,unit:item.unit},locale);
      return {...item,estimatedQuantity:normalized.quantity,unit:normalized.unit};
    }),
  };
}

export async function readExpiration(imageUrl:string) {
  if(serverEnv.USE_MOCK_AI==="true") return {mock:true,dates:[{value:new Date(Date.now()+7*86400000).toISOString().slice(0,10),label:"Best before",confidence:.94,yearMissing:false,suggestedYear:null,nearbyText:"賞味期限"}]};
  return structuredResponse({name:"expiration_dates",schema:expirationRecognitionSchema,jsonSchema:object({dates:{type:"array",items:object({value:nullableString,label:nullableString,confidence:{type:"number",minimum:0,maximum:1},yearMissing:{type:"boolean"},suggestedYear:{anyOf:[{type:"integer",minimum:2000,maximum:2200},{type:"null"}]},nearbyText:nullableString},["value","label","confidence","yearMissing","suggestedYear","nearbyText"])}},["dates"]),instructions:expirationExtractionPrompt,userText:"Read possible expiration or best-before dates from this package label.",imageUrl});
}

export async function generateRecipes(inventory:InventoryItem[], preferences:{maxCookingTime:number;difficulty:string;servings:number;dietaryPreferences:string;allergies:string;excludeIngredients:string}, locale:Locale="en") {
  if(serverEnv.USE_MOCK_AI==="true") {
    const mockRecipe = locale==="ja"
      ? {title:"野菜と卵の簡単丼",description:"早めに使いたい食材を活用する手軽な丼です。",difficulty:"Easy",cookingTimeMinutes:20,servings:preferences.servings,ingredientsUsed:inventory.slice(0,3).map((item)=>({name:item.name,quantity:Math.min(Number(item.quantity),1),unit:item.unit,inventoryItemId:item.id,available:true})),missingIngredients:[{name:"しょうゆ",quantity:2,unit:"大さじ",available:false}],steps:["野菜を準備します。","やわらかくなるまで加熱します。","卵を加えて十分に火を通します。","ご飯にのせて提供します。"],safetyNotes:["卵は十分に加熱し、アレルギーを確認してください。"],mock:true} satisfies RecipeDraft
      : {title:"Quick vegetable egg bowl",description:"A fast bowl that uses produce needing attention.",difficulty:"Easy",cookingTimeMinutes:20,servings:preferences.servings,ingredientsUsed:inventory.slice(0,3).map((item)=>({name:item.name,quantity:Math.min(Number(item.quantity),1),unit:item.unit,inventoryItemId:item.id,available:true})),missingIngredients:[{name:"Soy sauce",quantity:2,unit:"tbsp",available:false}],steps:["Prepare the vegetables.","Cook until tender.","Add egg and cook thoroughly.","Serve immediately."],safetyNotes:["Cook eggs until safely set and check allergens."],mock:true} satisfies RecipeDraft;
    return {mock:true,recipes:[reconcileRecipeInventory(mockRecipe,inventory)]};
  }
  const inventoryPayload=inventory.map(({id,name,quantity,unit,expiration_date})=>({id,name,quantity,unit,expiration_date}));
  const ingredient=object({name:{type:"string"},quantity:{type:"number",exclusiveMinimum:0},unit:{type:"string"},inventoryItemId:{anyOf:[{type:"string"},{type:"null"}]},available:{type:"boolean"}},["name","quantity","unit","inventoryItemId","available"]);
  const result = await structuredResponse({name:"inventory_recipes",schema:recipesResponseSchema,jsonSchema:object({recipes:{type:"array",minItems:1,maxItems:5,items:object({title:{type:"string"},description:{type:"string"},difficulty:{type:"string",enum:["Easy","Medium","Hard"]},cookingTimeMinutes:{type:"integer",minimum:1,maximum:360},servings:{type:"integer",minimum:1,maximum:20},ingredientsUsed:{type:"array",items:ingredient},missingIngredients:{type:"array",items:ingredient},steps:{type:"array",minItems:1,items:{type:"string"}},safetyNotes:{type:"array",items:{type:"string"}}},["title","description","difficulty","cookingTimeMinutes","servings","ingredientsUsed","missingIngredients","steps","safetyNotes"])}},["recipes"]),instructions:`${recipeGenerationPrompt} Write the recipe title, description, ingredient names, steps, and safety notes in ${locale==="ja"?"Japanese":"English"}. For inventory ingredients, copy the inventory id and unit exactly and never request more than the available quantity; put any shortage in missingIngredients.`,userText:`Inventory: ${JSON.stringify(inventoryPayload)}\nPreferences: ${JSON.stringify(preferences)}`});
  return {...result,recipes:result.recipes.map((recipe)=>reconcileRecipeInventory(recipe,inventory))};
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
