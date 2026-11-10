import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/page-header";
import { CookRecipeButton, type CookRecipeIngredient } from "@/components/cook-recipe-button";
import { formatQuantityUnit } from "@/lib/business/units";
import type { RecipeIngredient } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { user, supabase }, { locale }] = await Promise.all([params, requireUser(), getI18n()]);
  const { data } = await supabase.from("recipes").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!data) notFound();

  const ingredients = (data.ingredients_json ?? {}) as { used?: RecipeIngredient[]; missing?: RecipeIngredient[] };
  const used = ingredients.used ?? [];
  const inventoryIds = [...new Set(used.flatMap((item) => item.inventoryItemId ? [item.inventoryItemId] : []))];
  const { data: inventoryRows } = inventoryIds.length
    ? await supabase.from("inventory_items").select("id,name,quantity,unit,status").eq("user_id", user.id).in("id", inventoryIds)
    : { data: [] };
  const inventoryById = new Map((inventoryRows ?? []).map((item) => [item.id, item]));
  const cookIngredients: CookRecipeIngredient[] = used.map((ingredient) => {
    const inventory = ingredient.inventoryItemId ? inventoryById.get(ingredient.inventoryItemId) : undefined;
    return {
      ...ingredient,
      name: inventory?.name ?? ingredient.name,
      unit: inventory?.unit ?? ingredient.unit,
      availableQuantity: inventory?.status === "available" ? Number(inventory.quantity) : 0,
    };
  });
  const steps = Array.isArray(data.steps_json) ? data.steps_json as string[] : [];
  const safety = Array.isArray(data.safety_notes_json) ? data.safety_notes_json as string[] : [];
  const ja = locale === "ja";

  return (
    <main className="page max-w-3xl">
      <PageHeader
        eyebrow={`${data.difficulty ?? ""} · ${data.cooking_time_minutes ?? "?"} ${ja ? "分" : "min"} · ${data.servings ?? "?"} ${ja ? "人分" : "servings"}`}
        title={data.title}
        description={data.description}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-2xl">{ja ? "在庫から使う食材" : "Available ingredients"}</h2>
          <ul className="mt-3 space-y-2">{used.map((item, index) => <li key={item.inventoryItemId ?? index}>{item.name} — {formatQuantityUnit(item.quantity, item.unit, locale)}</li>)}</ul>
        </section>
        <section className="card p-5">
          <h2 className="text-2xl">{ja ? "不足している食材" : "Missing ingredients"}</h2>
          <ul className="mt-3 space-y-2">{(ingredients.missing ?? []).map((item, index) => <li key={index}>{item.name} — {formatQuantityUnit(item.quantity, item.unit, locale)}</li>)}</ul>
        </section>
      </div>
      <section className="card mt-4 p-5">
        <h2 className="text-2xl">{ja ? "手順" : "Steps"}</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5">{steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
      </section>
      {safety.length > 0 && (
        <section className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-sans text-lg font-bold">{ja ? "安全上の注意" : "Safety notes"}</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">{safety.map((note, index) => <li key={index}>{note}</li>)}</ul>
          <p className="mt-3 text-xs">{ja ? "期限だけで食品の安全性は判断できません。" : "Expiration dates alone cannot determine whether food is safe."}</p>
        </section>
      )}
      <CookRecipeButton ingredients={cookIngredients} />
    </main>
  );
}
