"use client";

import type { InventoryItem } from "@/lib/types";
import { recordUsage } from "@/app/(app)/inventory/actions";
import { useI18n } from "./locale-provider";

export function UsageForm({ item }: { item: InventoryItem }) {
  const { t } = useI18n();
  return (
    <form action={recordUsage} className="card mt-5 p-5">
      <input type="hidden" name="inventory_item_id" value={item.id} />
      <h2 className="text-2xl">{t("usage.record")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label><span className="label">{t("usage.amount")}</span><input className="input" name="quantity" type="number" min="0.001" max={item.quantity} step="any" required /></label>
        <label><span className="label">{t("usage.unit")}</span><input className="input" name="unit" defaultValue={item.unit} required /></label>
        <label><span className="label">{t("usage.action")}</span><select className="input" name="action"><option value="consumed">{t("action.consumed")}</option><option value="cooked">{t("action.cooked")}</option><option value="finished">{t("action.finished")}</option><option value="discarded">{t("action.discarded")}</option><option value="donated">{t("action.donated")}</option><option value="correction">{t("action.correction")}</option></select></label>
        <label><span className="label">{t("usage.note")}</span><input className="input" name="note" maxLength={500} /></label>
      </div>
      <button className="btn-primary mt-4">{t("usage.save")}</button>
    </form>
  );
}
