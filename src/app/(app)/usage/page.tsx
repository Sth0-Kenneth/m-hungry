import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getI18n } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export default async function Page() {
  const [{ user, supabase }, { t, locale }] = await Promise.all([requireUser(), getI18n()]);
  const { data } = await supabase.from("usage_logs").select("*,inventory_items(name)").eq("user_id", user.id).order("used_at", { ascending: false }).limit(100);
  const logs = data ?? [];
  const discarded = logs.filter((entry) => entry.action === "discarded");
  const waste = discarded.reduce((sum, entry) => sum + Number(entry.estimated_value || 0), 0);
  const wasteCurrency = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(waste);
  return (
    <main className="page">
      <PageHeader eyebrow={t("usage.eyebrow")} title={t("usage.title")} description={t("usage.description")} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="card p-4"><p className="text-xs font-bold uppercase text-[#687970]">{t("usage.actionsLogged")}</p><p className="mt-2 text-3xl font-bold">{logs.length}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-[#687970]">{t("usage.discarded")}</p><p className="mt-2 text-3xl font-bold">{discarded.length}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-[#687970]">{t("usage.wasteValue")}</p><p className="mt-2 text-3xl font-bold">{wasteCurrency}</p></div></div>
      {logs.length ? <div className="card overflow-hidden">{logs.map((entry) => { const joined = entry.inventory_items as unknown as { name: string } | null; const actionKey = `action.${entry.action}` as TranslationKey; return <article key={entry.id} className="flex items-center justify-between gap-4 border-b border-[#e4e5df] p-4 last:border-0"><div><b>{joined?.name ?? t("usage.deletedItem")}</b><p className="text-sm text-[#687970]">{t(actionKey)} · {new Date(entry.used_at).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}</p></div><span className="font-bold">{entry.quantity} {entry.unit}</span></article>; })}</div> : <EmptyState title={t("usage.emptyTitle")} description={t("usage.emptyCopy")} href="/inventory" label={t("usage.viewInventory")} />}
    </main>
  );
}
