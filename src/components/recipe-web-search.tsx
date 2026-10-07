"use client";

import { type FormEvent, useState } from "react";
import { ExternalLink, LoaderCircle, Search } from "lucide-react";
import type { WebRecipeResult } from "@/lib/types";
import { useI18n } from "./locale-provider";

export function RecipeWebSearch({ suggestedIngredients }: { suggestedIngredients: string[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [includeInventory, setIncludeInventory] = useState(true);
  const [results, setResults] = useState<WebRecipeResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mock, setMock] = useState(false);

  function addIngredient(name: string) {
    setQuery((current) => current.trim() ? `${current.trim()}, ${name}` : name);
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return;
    setBusy(true);
    setError("");
    setHasSearched(true);
    try {
      const response = await fetch("/api/recipes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: normalizedQuery, includeInventory }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || t("recipeSearch.failed"));
      setResults(body.results);
      setMock(Boolean(body.mock));
    } catch (caught) {
      setResults([]);
      setError(caught instanceof Error ? caught.message : t("recipeSearch.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-2xl"><Search size={22} />{t("recipeSearch.formTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#64756d]">{t("recipeSearch.formCopy")}</p>
        <form className="mt-5 space-y-4" onSubmit={search}>
          <label>
            <span className="label">{t("recipeSearch.queryLabel")}</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="input" placeholder={t("recipeSearch.placeholder")} value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={200} required />
              <button className="btn-primary shrink-0" disabled={busy || query.trim().length < 2} type="submit">{busy ? <LoaderCircle className="animate-spin" /> : <Search size={18} />}{t("recipeSearch.submit")}</button>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-[#dfe5de] p-3 text-sm">
            <input className="mt-1 size-4" type="checkbox" checked={includeInventory} onChange={(event) => setIncludeInventory(event.target.checked)} />
            <span><b>{t("recipeSearch.inventoryLabel")}</b><span className="mt-1 block text-xs text-[#64756d]">{t("recipeSearch.inventoryCopy")}</span></span>
          </label>
        </form>

        {suggestedIngredients.length > 0 && <div className="mt-5"><p className="label">{t("recipeSearch.suggestions")}</p><div className="mt-2 flex flex-wrap gap-2">{suggestedIngredients.map((name) => <button className="rounded-full border border-[#bdd0c3] px-3 py-1.5 text-sm font-bold text-[#285f45] hover:bg-[#edf3ea]" key={name} onClick={() => addIngredient(name)} type="button">+ {name}</button>)}</div></div>}
      </section>

      <p className="rounded-xl bg-[#edf3ea] p-3 text-sm text-[#395347]">{t("recipeSearch.sourceNotice")}</p>
      {mock && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t("recipeSearch.mockNotice")}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div aria-live="polite" className="sr-only">{busy ? t("recipeSearch.loading") : ""}</div>
      {!busy && hasSearched && !error && results.length === 0 && <section className="card p-6 text-center"><h2 className="text-xl">{t("recipeSearch.emptyTitle")}</h2><p className="mt-2 text-sm text-[#64756d]">{t("recipeSearch.emptyCopy")}</p></section>}
      {results.length > 0 && (
        <section>
          <h2 className="mb-3 text-2xl">{t("recipeSearch.resultsTitle")}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {results.map((result) => <article className="card flex flex-col p-5" key={result.sourceUrl}><p className="text-xs font-bold uppercase tracking-wide text-[#397357]">{result.sourceDomain}</p><h3 className="mt-1 text-xl">{result.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-[#64756d]">{result.summary}</p>{result.ingredientsHighlighted.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{result.ingredientsHighlighted.map((ingredient) => <span className="rounded-full bg-[#edf3ea] px-2.5 py-1 text-xs" key={ingredient}>{ingredient}</span>)}</div>}<a className="btn-secondary mt-4" href={result.sourceUrl} target="_blank" rel="noopener noreferrer">{t("recipeSearch.openSource")}<ExternalLink size={16} /></a></article>)}
          </div>
        </section>
      )}
    </div>
  );
}
