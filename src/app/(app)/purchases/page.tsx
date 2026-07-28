import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getI18n } from "@/lib/i18n/server";

export default async function Page() {
  const [{ user, supabase }, { t, locale }] = await Promise.all([requireUser(), getI18n()]);
  const { data } = await supabase.from("purchases").select("*").eq("user_id", user.id).order("purchase_date", { ascending: false });
  return (
    <main className="page">
      <PageHeader eyebrow={t("purchases.eyebrow")} title={t("purchases.title")} />
      {data?.length ? <div className="space-y-3">{data.map((purchase) => <Link className="card flex items-center justify-between p-4" href={`/purchases/${purchase.id}`} key={purchase.id}><div><h2 className="text-xl">{purchase.store_name || t("purchases.unknownStore")}</h2><p className="text-sm text-[#687970]">{purchase.purchase_date ? new Date(`${purchase.purchase_date}T00:00:00`).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US") : t("purchases.noDate")}</p></div><b>{purchase.currency} {Number(purchase.total_amount || 0).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}</b></Link>)}</div> : <EmptyState title={t("purchases.emptyTitle")} description={t("purchases.emptyCopy")} href="/scan/receipt" label={t("purchases.scan")} />}
    </main>
  );
}
