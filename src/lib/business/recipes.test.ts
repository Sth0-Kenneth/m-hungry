import { describe, expect, it } from "vitest";
import type { InventoryItem, RecipeDraft } from "@/lib/types";
import { reconcileRecipeInventory } from "./recipes";

const inventory = [{
  id: "8b70715e-5c1b-4b6f-b899-ac3bce532ba0",
  name: "牛乳",
  category: "Dairy",
  brand: null,
  barcode: null,
  quantity: 0.5,
  unit: "リットル",
  purchase_date: null,
  expiration_date: null,
  expiration_source: "unknown",
  opened_date: null,
  storage_location: "refrigerator",
  unit_price: null,
  estimated_value: null,
  image_path: null,
  notes: null,
  status: "available",
  created_at: "2026-10-28T00:00:00Z",
}] satisfies InventoryItem[];

const recipe = {
  title: "ミルクスープ",
  description: "",
  difficulty: "Easy",
  cookingTimeMinutes: 10,
  servings: 2,
  ingredientsUsed: [{
    name: "Milk",
    quantity: 1,
    unit: "cup",
    inventoryItemId: inventory[0].id,
    available: true,
  }],
  missingIngredients: [],
  steps: ["温める"],
  safetyNotes: [],
} satisfies RecipeDraft;

describe("recipe inventory reconciliation", () => {
  it("uses the inventory language and unit and caps the deduction", () => {
    const result = reconcileRecipeInventory(recipe, inventory);
    expect(result.ingredientsUsed[0]).toMatchObject({
      name: "牛乳",
      quantity: 0.5,
      requiredQuantity: 1,
      unit: "リットル",
      available: false,
    });
    expect(result.missingIngredients[0]).toMatchObject({ quantity: 0.5, unit: "リットル" });
  });
});
