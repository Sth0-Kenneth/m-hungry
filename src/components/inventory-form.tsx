"use client";

import { useState } from "react";
import type { InventoryItem } from "@/lib/types";
import { useI18n } from "./locale-provider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { suggestedInventoryUnit } from "@/lib/business/units";

const categories = ["Produce", "Dairy", "Meat", "Seafood", "Bakery", "Frozen", "Pantry", "Beverages", "Other"] as const;

export function InventoryForm({
  item,
  action,
}: {
  item?: InventoryItem;
  action: (data: FormData) => void | Promise<void>;
}) {
  const { t, locale } = useI18n();
  const defaultUnit = locale === "ja" ? "個" : "piece";
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [unit, setUnit] = useState(item?.unit ?? defaultUnit);
  const [unitEdited, setUnitEdited] = useState(Boolean(item));

  function updateSuggestedUnit(nextName: string, nextCategory: string) {
    if (!unitEdited) {
      setUnit(suggestedInventoryUnit(nextName, nextCategory, locale, defaultUnit));
    }
  }
  return (
    <form action={action} className="card grid gap-5 p-5 md:grid-cols-2 md:p-7">
      <label className="md:col-span-2"><span className="label">{t("form.name")}</span><input name="name" className="input" value={name} onChange={(event) => { const value = event.target.value; setName(value); updateSuggestedUnit(value, category); }} required maxLength={120} /></label>
      <label><span className="label">{t("form.category")}</span><input name="category" list="categories" className="input" value={category} onChange={(event) => { const value = event.target.value; setCategory(value); updateSuggestedUnit(name, value); }} /><datalist id="categories">{categories.map((categoryOption) => <option key={categoryOption} value={categoryOption} label={t(`category.${categoryOption}` as TranslationKey)} />)}</datalist></label>
      <label><span className="label">{t("form.brand")}</span><input name="brand" className="input" defaultValue={item?.brand ?? ""} /></label>
      {item
        ? <input type="hidden" name="quantity" value={item.quantity} />
        : <label><span className="label">{t("form.quantity")}</span><input name="quantity" type="number" min="0.001" step="any" className="input" defaultValue={1} required /></label>}
      <label><span className="label">{t("form.unit")}</span><input name="unit" className="input" value={unit} onChange={(event) => { setUnit(event.target.value); setUnitEdited(true); }} required /></label>
      <label><span className="label">{t("form.purchaseDate")}</span><input name="purchase_date" type="date" className="input" defaultValue={item?.purchase_date ?? ""} /></label>
      <label><span className="label">{t("form.expirationDate")}</span><input name="expiration_date" type="date" className="input" defaultValue={item?.expiration_date ?? ""} /></label>
      <label><span className="label">{t("form.expirationSource")}</span><select name="expiration_source" className="input" defaultValue={item?.expiration_source ?? "manual"}><option value="manual">{t("source.manual")}</option><option value="package_scan">{t("source.package_scan")}</option><option value="manufacturer_data">{t("source.manufacturer_data")}</option><option value="estimated">{t("source.estimated")}</option><option value="unknown">{t("source.unknown")}</option></select></label>
      <label><span className="label">{t("form.storage")}</span><select name="storage_location" className="input" defaultValue={item?.storage_location ?? "refrigerator"}><option value="refrigerator">{t("storage.refrigerator")}</option><option value="freezer">{t("storage.freezer")}</option><option value="pantry">{t("storage.pantry")}</option><option value="other">{t("storage.other")}</option></select></label>
      <label><span className="label">{t("form.unitPrice")}</span><input name="unit_price" type="number" min="0" step="0.01" className="input" defaultValue={item?.unit_price ?? ""} /></label>
      <label><span className="label">{t("form.openedDate")}</span><input name="opened_date" type="date" className="input" defaultValue={item?.opened_date ?? ""} /></label>
      <label className="md:col-span-2"><span className="label">{t("form.notes")}</span><textarea name="notes" rows={3} className="input" defaultValue={item?.notes ?? ""} /></label>
      <div className="md:col-span-2"><button className="btn-primary">{t(item ? "form.save" : "form.add")}</button></div>
    </form>
  );
}
