import Link from "next/link";
import { Camera, ReceiptText, ScanBarcode, CalendarSearch, ArrowRight, Package, Utensils, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import type { InventoryItem } from "@/lib/types";
import { getExpirationState } from "@/lib/business/expiration";
import { InventoryCard } from "@/components/inventory-card";
import { getI18n } from "@/lib/i18n/server";

export default async function Page() {
  const [{ user, supabase }, { t, locale }] = await Promise.all([requireUser(), getI18n()]);
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: items }, { data: usage }] = await Promise.all([
    supabase.from("inventory_items").select("*").eq("user_id", user.id).eq("status", "available").order("created_at", { ascending: false }),
    supabase.from("usage_logs").select("action,quantity,estimated_value").eq("user_id", user.id).gte("used_at", `${today}T00:00:00`),
  ]);
  const inventory = (items ?? []) as InventoryItem[];
  const states = inventory.map((item) => getExpirationState(item.expiration_date));
  const waste = (usage ?? []).filter((entry) => entry.action === "discarded").reduce((sum, entry) => sum + Number(entry.estimated_value || 0), 0);
  const currency = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(waste);
  const scans = [
    ["/scan/receipt", t("dashboard.receipt"), ReceiptText],
    ["/scan/food", t("dashboard.food"), Camera],
    ["/scan/barcode", t("dashboard.barcode"), ScanBarcode],
    ["/scan/expiration", t("dashboard.expiryLabel"), CalendarSearch],
  ] as const;
  return (
    <main className="page">
      <header className="mb-8"><p className="text-sm text-[#63766c]">{t("dashboard.eyebrow")}</p><h1 className="mt-1 text-4xl md:text-5xl">{t("dashboard.title")}</h1></header>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={<CalendarSearch />} label={t("dashboard.expiresToday")} value={states.filter((state) => state === "today").length} tone="orange" />
        <Metric icon={<CalendarSearch />} label={t("dashboard.within3")} value={states.filter((state) => ["tomorrow", "soon"].includes(state)).length} tone="yellow" />
        <Metric icon={<Package />} label={t("dashboard.active")} value={inventory.length} />
        <Metric icon={<Utensils />} label={t("dashboard.todayUsage")} value={(usage ?? []).length} />
      </section>
      <section className="mt-8">
        <h2 className="mb-4 text-2xl">{t("dashboard.quickScan")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{scans.map(([href, label, Icon]) => <Link key={href} href={href} className="card flex min-h-28 flex-col justify-between p-4 font-bold transition hover:bg-[#edf3ea]"><Icon /><span className="flex items-center justify-between">{label}<ArrowRight size={16} /></span></Link>)}</div>
      </section>
      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl">{t("dashboard.recent")}</h2><Link href="/inventory" className="text-sm font-bold">{t("dashboard.viewAll")}</Link></div>
          {inventory.length ? <div className="grid gap-3 sm:grid-cols-2">{inventory.slice(0, 4).map((item) => <InventoryCard key={item.id} item={item} />)}</div> : <div className="card p-6 text-sm">{t("dashboard.noItems")}</div>}
        </div>
        <div className="card h-fit bg-[#174c37] p-5 text-white"><Trash2 /><p className="mt-5 text-sm text-white/70">{t("dashboard.waste")}</p><p className="text-4xl font-bold">{currency}</p><p className="mt-4 text-xs text-white/65">{t("dashboard.wasteCopy")}</p></div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: string }) {
  return <div className={`card p-4 ${tone === "orange" ? "border-orange-300" : tone === "yellow" ? "border-yellow-300" : ""}`}><div className="text-[#517060]">{icon}</div><p className="mt-4 text-3xl font-bold">{value}</p><p className="text-sm text-[#65766e]">{label}</p></div>;
}
