import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RecipeWebSearch } from "@/components/recipe-web-search";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export default async function Page() {
  const [{ user, supabase }, { t }] = await Promise.all([requireUser(), getI18n()]);
  const { data } = await supabase
    .from("inventory_items")
    .select("name")
    .eq("user_id", user.id)
    .eq("status", "available")
    .order("expiration_date", { ascending: true, nullsFirst: false })
    .limit(8);
  const suggestedIngredients = [...new Set((data ?? []).map((item) => item.name).filter(Boolean))];

  return (
    <main className="page max-w-4xl">
      <PageHeader
        eyebrow={t("recipeSearch.eyebrow")}
        title={t("recipeSearch.title")}
        description={t("recipeSearch.description")}
        action={<Link className="btn-secondary" href="/recipes"><ArrowLeft size={18} />{t("recipeSearch.back")}</Link>}
      />
      <RecipeWebSearch suggestedIngredients={suggestedIngredients} />
    </main>
  );
}
