import Link from "next/link";
import { Search } from "lucide-react";
import { RecipeStudio } from "@/components/recipe-studio";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth";

export default async function Page() {
  const [{ locale }, { user, supabase }] = await Promise.all([getI18n(), requireUser()]);
  const [{ data: settings }, { data: history }] = await Promise.all([
    supabase.from("user_settings").select("preferred_cooking_time").eq("user_id", user.id).maybeSingle(),
    supabase.from("recipes").select("id,title,source_type,created_at,cooking_time_minutes").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
  ]);

  return (
    <main className="page">
      <PageHeader
        eyebrow={locale === "ja" ? "献立づくり" : "Meal planning"}
        title={locale === "ja" ? "レシピ" : "Recipes"}
        description={locale === "ja" ? "在庫からレシピを生成するか、ウェブで元のレシピを検索できます。" : "Generate recipes from your inventory or search the web for original recipe sources."}
        action={<Link className="btn-secondary" href="/recipes/search"><Search size={18} />{locale === "ja" ? "ウェブ検索" : "Search the web"}</Link>}
      />
      <RecipeStudio defaultTime={Number(settings?.preferred_cooking_time) || 30} />
      {history?.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-2xl">{locale === "ja" ? "レシピ履歴" : "Recipe history"}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((recipe) => <Link className="card p-4" href={`/recipes/${recipe.id}`} key={recipe.id}><p className="text-xs font-bold uppercase text-[#397357]">{recipe.source_type.replace("_", " ")} · {recipe.cooking_time_minutes ?? "?"} min</p><h3 className="mt-2 text-xl">{recipe.title}</h3></Link>)}
          </div>
        </section>
      ) : null}
    </main>
  );
}
