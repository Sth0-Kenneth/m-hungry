import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import type { InventoryItem } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { InventoryCard } from "@/components/inventory-card";
import { EmptyState } from "@/components/empty-state";
import { getI18n } from "@/lib/i18n/server";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; storage?: string }> }) {
  const [{ user, supabase }, { t }] = await Promise.all([requireUser(), getI18n()]);
  const params = await searchParams;
  let query = supabase.from("inventory_items").select("*").eq("user_id", user.id).eq("status", "available").order("expiration_date", { ascending: true, nullsFirst: false });
  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (params.storage) query = query.eq("storage_location", params.storage);
  const { data } = await query;
  const items = (data ?? []) as InventoryItem[];
  return (
    <main className="page">
      <PageHeader eyebrow={t("inventory.eyebrow")} title={t("inventory.title")} description={t("inventory.description")} action={<Link className="btn-primary shrink-0" href="/inventory/new"><Plus size={18} /><span className="hidden sm:inline">{t("inventory.add")}</span></Link>} />
      <form className="mb-5 grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
        <label className="relative"><span className="sr-only">{t("inventory.search")}</span><Search className="absolute left-3 top-3" size={18} /><input name="q" className="input !pl-10" placeholder={t("inventory.searchPlaceholder")} defaultValue={params.q} /></label>
        <select name="storage" className="input" defaultValue={params.storage ?? ""}><option value="">{t("inventory.allLocations")}</option><option value="refrigerator">{t("storage.refrigerator")}</option><option value="freezer">{t("storage.freezer")}</option><option value="pantry">{t("storage.pantry")}</option><option value="other">{t("storage.other")}</option></select>
        <button className="btn-secondary">{t("common.filter")}</button>
      </form>
      {items.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <InventoryCard key={item.id} item={item} />)}</div> : <EmptyState title={t("inventory.emptyTitle")} description={t("inventory.emptyCopy")} href="/scan/receipt" label={t("inventory.scanReceipt")} />}
    </main>
  );
}
