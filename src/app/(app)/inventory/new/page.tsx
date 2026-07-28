import { PageHeader } from "@/components/page-header";
import { InventoryForm } from "@/components/inventory-form";
import { getI18n } from "@/lib/i18n/server";
import { createItem } from "../actions";

export default async function Page() {
  const { t } = await getI18n();
  return <main className="page max-w-3xl"><PageHeader eyebrow={t("inventory.title")} title={t("inventory.newTitle")} description={t("inventory.newCopy")} /><InventoryForm action={createItem} /></main>;
}
