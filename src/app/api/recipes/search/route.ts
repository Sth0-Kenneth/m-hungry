import { NextResponse } from "next/server";
import { authenticated, externalFailure } from "@/lib/api";
import { recipeSearchProvider } from "@/lib/recipes/search-provider";
import type { InventoryItem } from "@/lib/types";
import { recipeSearchRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await authenticated("recipe-search", 8);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = recipeSearchRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a recipe search." }, { status: 400 });

  let inventory: InventoryItem[] = [];
  if (parsed.data.includeInventory) {
    const { data, error } = await auth.supabase
      .from("inventory_items")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("status", "available")
      .order("expiration_date", { ascending: true, nullsFirst: false })
      .limit(30);
    if (error) return externalFailure("Inventory could not be loaded.");
    inventory = (data ?? []) as InventoryItem[];
  }

  try {
    const result = await recipeSearchProvider.search({ inventory, query: parsed.data.query });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Recipe search failed", error instanceof Error ? error.message : "unknown");
    return externalFailure("Recipe search is unavailable.");
  }
}
