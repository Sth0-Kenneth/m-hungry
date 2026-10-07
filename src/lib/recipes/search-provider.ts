import "server-only";

import type { InventoryItem, WebRecipeResult } from "@/lib/types";
import { searchRecipes } from "@/lib/ai/features";

export type RecipeSearchRequest = {
  inventory: InventoryItem[];
  query: string;
};

export type RecipeSearchResponse = {
  results: WebRecipeResult[];
  mock?: boolean;
};

export interface RecipeSearchProvider {
  search(request: RecipeSearchRequest): Promise<RecipeSearchResponse>;
}

class GeminiRecipeSearchProvider implements RecipeSearchProvider {
  search({ inventory, query }: RecipeSearchRequest) {
    return searchRecipes(inventory, query);
  }
}

export const recipeSearchProvider: RecipeSearchProvider = new GeminiRecipeSearchProvider();
