import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ user, supabase }, { t, locale }] = await Promise.all([requireUser(), getI18n()]);
  const { data: purchase } = await supabase.from("purchases").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!purchase) notFound();
  const { data: items } = await supabase.from("purchase_items").select("*").eq("purchase_id", id).eq("user_id", user.id);
  const date = purchase.purchase_date ? new Date(`${purchase.purchase_date}T00:00:00`).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US") : t("purchases.purchase");
  return (
    <main className="page max-w-3xl">
      <PageHeader eyebrow={date} title={purchase.store_name || t("purchases.unknownStore")} />
      <div className="card overflow-hidden">
        {items?.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border-b border-[#e2e5de] p-4 last:border-0"><div><b>{item.normalized_name}</b><p className="text-xs text-[#687970]">{t("purchases.original", { name: item.raw_name })}{item.added_to_inventory ? ` · ${t("purchases.added")}` : ""}</p></div><span className="text-right">{item.quantity} {item.unit} · {purchase.currency} {Number(item.total_price || 0).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}</span></div>)}
        <div className="flex justify-between bg-[#f2f3ed] p-4 text-lg font-bold"><span>{t("common.total")}</span><span>{purchase.currency} {Number(purchase.total_amount || 0).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}</span></div>
      </div>
    </main>
  );
}
