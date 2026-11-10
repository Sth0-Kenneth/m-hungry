"use client";

import { useState } from "react";
import { LoaderCircle, Minus, Plus, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RecipeIngredient } from "@/lib/types";
import { formatQuantityUnit, quantityStep } from "@/lib/business/units";
import { useI18n } from "./locale-provider";

export type CookRecipeIngredient = RecipeIngredient & { availableQuantity: number };

const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;

export function CookRecipeButton({ ingredients }: { ingredients: CookRecipeIngredient[] }) {
  const { locale } = useI18n();
  const ja = locale === "ja";
  const router = useRouter();
  const usable = ingredients.filter((item) => item.inventoryItemId && item.availableQuantity > 0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(usable.map((item) => [item.inventoryItemId!, Math.min(item.quantity, item.availableQuantity)])),
  );

  function adjust(item: CookRecipeIngredient, direction: -1 | 1) {
    const id = item.inventoryItemId!;
    const step = quantityStep(item.unit);
    setAmounts((current) => ({
      ...current,
      [id]: roundQuantity(Math.max(0, Math.min(item.availableQuantity, (current[id] ?? 0) + direction * step))),
    }));
  }

  function openDialog() {
    setAmounts(Object.fromEntries(usable.map((item) => [item.inventoryItemId!, Math.min(item.quantity, item.availableQuantity)])));
    setError("");
    setOpen(true);
  }

  async function cook() {
    const items = usable.flatMap((item) => {
      const quantity = amounts[item.inventoryItemId!] ?? 0;
      return quantity > 0 ? [{ inventoryItemId: item.inventoryItemId, quantity, unit: item.unit }] : [];
    });
    if (!items.length) {
      setError(ja ? "差し引く量を1つ以上選んでください。" : "Choose at least one amount to subtract.");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/api/recipes/cook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(body.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!usable.length) return null;
  return (
    <div className="mt-6">
      {!open ? (
        <button className="btn-primary" onClick={openDialog}>
          <Utensils size={18} />{ja ? "このレシピを作る" : "Cook this recipe"}
        </button>
      ) : (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="font-sans font-bold">{ja ? "在庫から差し引く量を調整" : "Adjust inventory deductions"}</h3>
          <div className="mt-3 space-y-3">
            {usable.map((item) => {
              const id = item.inventoryItemId!;
              const amount = amounts[id] ?? 0;
              const requested = item.requiredQuantity ?? item.quantity;
              const short = requested > item.availableQuantity;
              return (
                <div className="rounded-lg bg-white p-3" key={id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <b>{item.name}</b>
                      <p className="text-xs text-[#687970]">
                        {ja ? "在庫" : "Available"}: {formatQuantityUnit(item.availableQuantity, item.unit, locale)}
                      </p>
                      {short && (
                        <p className="mt-1 text-xs text-amber-800">
                          {ja ? "必要量" : "Recipe needs"}: {formatQuantityUnit(requested, item.unit, locale)} — {ja ? "在庫分だけ差し引けます。" : "you can subtract the available amount."}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="rounded-lg border border-[#c8d0c9] p-2 disabled:opacity-40" aria-label={`${ja ? "減らす" : "Decrease"} ${item.name}`} disabled={amount <= 0} onClick={() => adjust(item, -1)}><Minus size={16} /></button>
                      <span className="min-w-24 text-center font-bold">{formatQuantityUnit(amount, item.unit, locale)}</span>
                      <button type="button" className="rounded-lg border border-[#c8d0c9] p-2 disabled:opacity-40" aria-label={`${ja ? "増やす" : "Increase"} ${item.name}`} disabled={amount >= item.availableQuantity} onClick={() => adjust(item, 1)}><Plus size={16} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs">{ja ? "確定すると使用履歴に記録され、在庫から差し引かれます。" : "Confirmation records usage and subtracts these amounts from inventory."}</p>
          {error && <p className="mt-2 text-sm text-red-800">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy} onClick={cook}>{busy && <LoaderCircle className="animate-spin" />}{ja ? "確認して差し引く" : "Confirm and subtract"}</button>
            <button className="btn-secondary" disabled={busy} onClick={() => setOpen(false)}>{ja ? "キャンセル" : "Cancel"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
