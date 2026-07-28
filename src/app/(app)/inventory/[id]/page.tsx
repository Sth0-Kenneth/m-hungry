import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { InventoryItem } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { InventoryForm } from "@/components/inventory-form";
import { UsageForm } from "@/components/usage-form";
import { deleteItem, markOpened, updateItem } from "../actions";
import { ExpirationBadge } from "@/components/expiration-badge";
import { getI18n } from "@/lib/i18n/server";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ user, supabase }, { t }] = await Promise.all([requireUser(), getI18n()]);
  const { data } = await supabase.from("inventory_items").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!data) notFound();
  const item = data as InventoryItem;
  return (
    <main className="page max-w-3xl">
      <PageHeader eyebrow={t("inventory.itemEyebrow")} title={item.name} action={<ExpirationBadge date={item.expiration_date} />} />
      <InventoryForm item={item} action={updateItem.bind(null, id)} />
      <div className="mt-4 flex flex-wrap gap-2">
        {!item.opened_date && <form action={markOpened.bind(null, id)}><button className="btn-secondary">{t("inventory.opened")}</button></form>}
        <form action={deleteItem.bind(null, id)}><button className="rounded-xl border border-red-300 bg-white px-4 py-3 font-bold text-red-700">{t("inventory.delete")}</button></form>
      </div>
      {item.status === "available" && <UsageForm item={item} />}
    </main>
  );
}
