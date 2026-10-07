"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Sparkles } from "lucide-react";
import type { RecipeDraft } from "@/lib/types";
import { useI18n } from "./locale-provider";

type GeneratedRecipe = RecipeDraft & { id: string };

export function RecipeStudio({ defaultTime }: { defaultTime: number }) {
  const { locale } = useI18n();
  const ja = locale === "ja";
  const [time, setTime] = useState(defaultTime);
  const [difficulty, setDifficulty] = useState("Any");
  const [servings, setServings] = useState(2);
  const [diet, setDiet] = useState("");
  const [allergies, setAllergies] = useState("");
  const [exclude, setExclude] = useState("");
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mock, setMock] = useState(false);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai/generate-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxCookingTime: time, difficulty, servings, dietaryPreferences: diet, allergies, excludeIngredients: exclude }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setRecipes(body.recipes);
      setMock(Boolean(body.mock));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Recipe generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-2xl"><Sparkles size={22} />{ja ? "在庫からAIレシピ" : "AI recipes from inventory"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label><span className="label">{ja ? "調理時間（分）" : "Maximum minutes"}</span><input className="input" type="number" min="5" max="360" value={time} onChange={(event) => setTime(Number(event.target.value))} /></label>
          <label><span className="label">{ja ? "難易度" : "Difficulty"}</span><select className="input" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Any</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
          <label><span className="label">{ja ? "人数" : "Servings"}</span><input className="input" type="number" min="1" max="20" value={servings} onChange={(event) => setServings(Number(event.target.value))} /></label>
          <label><span className="label">{ja ? "食事の希望" : "Dietary preferences"}</span><input className="input" value={diet} onChange={(event) => setDiet(event.target.value)} /></label>
          <label><span className="label">{ja ? "アレルギー" : "Allergies"}</span><input className="input" value={allergies} onChange={(event) => setAllergies(event.target.value)} /></label>
          <label><span className="label">{ja ? "除外する食材" : "Exclude ingredients"}</span><input className="input" value={exclude} onChange={(event) => setExclude(event.target.value)} /></label>
        </div>
        <button className="btn-primary mt-4 w-full" disabled={busy} onClick={generate}>{busy && <LoaderCircle className="animate-spin" />}{ja ? "レシピを生成" : "Generate recipes"}</button>
      </section>

      {mock && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{ja ? "モックAIの結果です。外部AIへのリクエストはありません。" : "Mock AI result — no external AI request was made."}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {recipes.length > 0 && (
        <section>
          <h2 className="mb-3 text-2xl">{ja ? "生成したレシピ" : "Generated recipes"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {recipes.map((recipe) => <article className="card p-5" key={recipe.id}><p className="text-xs font-bold uppercase text-[#397357]">{recipe.difficulty} · {recipe.cookingTimeMinutes} min</p><h3 className="mt-2 text-2xl">{recipe.title}</h3><p className="mt-2 text-sm text-[#64756d]">{recipe.description}</p><p className="mt-3 text-sm"><b>{ja ? "不足" : "Missing"}:</b> {recipe.missingIngredients.map((ingredient) => ingredient.name).join(", ") || (ja ? "なし" : "None")}</p><Link className="btn-secondary mt-4" href={`/recipes/${recipe.id}`}>{ja ? "詳細と調理" : "View and cook"}</Link></article>)}
          </div>
        </section>
      )}
    </div>
  );
}
