import type { InventoryItem, RecipeDraft, RecipeIngredient } from "@/lib/types";

const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;

export function reconcileRecipeInventory(recipe: RecipeDraft, inventory: InventoryItem[]): RecipeDraft {
  const inventoryById = new Map(inventory.map((item) => [item.id, item]));
  const requiredById = new Map<string, number>();
  const missing: RecipeIngredient[] = recipe.missingIngredients.map((ingredient) => ({
    ...ingredient,
    inventoryItemId: null,
    available: false,
  }));

  for (const ingredient of recipe.ingredientsUsed) {
    const id = ingredient.inventoryItemId;
    if (!id || !inventoryById.has(id)) {
      missing.push({ ...ingredient, inventoryItemId: null, available: false });
      continue;
    }
    requiredById.set(id, (requiredById.get(id) ?? 0) + ingredient.quantity);
  }

  const used: RecipeIngredient[] = [];
  for (const [id, unroundedRequired] of requiredById) {
    const item = inventoryById.get(id)!;
    const required = roundQuantity(unroundedRequired);
    const available = Math.max(0, Number(item.quantity));
    const deduction = roundQuantity(Math.min(required, available));

    if (deduction > 0) {
      used.push({
        name: item.name,
        quantity: deduction,
        requiredQuantity: required,
        unit: item.unit,
        inventoryItemId: item.id,
        available: available >= required,
      });
    }
    if (required > available) {
      missing.push({
        name: item.name,
        quantity: roundQuantity(required - available),
        unit: item.unit,
        inventoryItemId: null,
        available: false,
      });
    }
  }

  return { ...recipe, ingredientsUsed: used, missingIngredients: missing };
}
