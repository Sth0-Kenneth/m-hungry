import { describe, expect, it } from "vitest";
import { expirationRecognitionSchema, foodRecognitionSchema, recipeSearchRequestSchema, recipesResponseSchema } from "./validation";
import { geminiGroundedSources, geminiOutputText, parseGeminiJson } from "./ai/gemini-parsers";
import { receiptAiSchema } from "./validation";

describe("phase 3 AI response validation",()=>{
 it("rejects invalid confidence",()=>expect(foodRecognitionSchema.safeParse({items:[{name:"Banana",category:"Produce",estimatedQuantity:1,unit:"piece",confidence:2}]}).success).toBe(false));
 it("requires explicit missing-year metadata",()=>expect(expirationRecognitionSchema.safeParse({dates:[{value:null,label:"Best before",confidence:.8,yearMissing:true,suggestedYear:2026,nearbyText:"賞味期限"}]}).success).toBe(true));
});

describe("Gemini response safety",()=>{
 it("extracts structured output text and only valid cited URLs",()=>{const body={steps:[{type:"model_output",content:[{type:"text",text:'{"items":[]}',annotations:[{type:"url_citation",url:"https://example.com/recipe",title:"Example recipe"},{type:"url_citation",url:"javascript:alert(1)",title:"Unsafe"}]}]}]};expect(geminiOutputText(body)).toBe('{"items":[]}');expect(geminiGroundedSources(body)).toEqual([{title:"Example recipe",url:"https://example.com/recipe"}]);});
 it("parses plain and Markdown-fenced JSON",()=>{expect(parseGeminiJson('{"ok":true}')).toEqual({ok:true});expect(parseGeminiJson('```json\n{"ok":true}\n```')).toEqual({ok:true});});
 it("validates a fenced Japanese receipt response",()=>{const parsed=parseGeminiJson('```json\n{"storeName":"スーパーサクラ 桜丘店","purchaseDate":"2026-09-01","currency":"JPY","subtotal":902,"tax":72,"total":974,"items":[{"rawName":"牛乳 1L","normalizedName":"Milk","quantity":1,"unit":"carton","unitPrice":218,"totalPrice":218,"category":"Dairy","addToInventory":true}]}\n```');expect(receiptAiSchema.parse(parsed)).toMatchObject({storeName:"スーパーサクラ 桜丘店",total:974});});
});

describe("recipe inventory assumptions",()=>{
 it("rejects empty recipe steps",()=>expect(recipesResponseSchema.safeParse({recipes:[{title:"Soup",description:"",difficulty:"Easy",cookingTimeMinutes:10,servings:2,ingredientsUsed:[],missingIngredients:[],steps:[],safetyNotes:[]}]}).success).toBe(false));
 it("validates web search preferences",()=>expect(recipeSearchRequestSchema.parse({query:"  chicken and eggs  ",includeInventory:false})).toEqual({query:"chicken and eggs",includeInventory:false}));
});
