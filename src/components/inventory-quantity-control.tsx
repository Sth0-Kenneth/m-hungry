"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { adjustInventoryQuantity } from "@/app/(app)/inventory/actions";
import { formatQuantityUnit, quantityStep } from "@/lib/business/units";
import type { InventoryItem } from "@/lib/types";
import { useI18n } from "./locale-provider";

type QuantityItem = Pick<InventoryItem, "id" | "name" | "quantity" | "unit">;

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function InventoryQuantityControl({
  item,
  compact = false,
}: {
  item: QuantityItem;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const itemQuantity = roundQuantity(Number(item.quantity));
  const [baseQuantity, setBaseQuantity] = useState(itemQuantity);
  const [pendingQuantity, setPendingQuantity] = useState(itemQuantity);
  const [saving, startTransition] = useTransition();
  const step = quantityStep(item.unit);
  const delta = roundQuantity(pendingQuantity - baseQuantity);
  const changed = delta !== 0;

  function adjust(direction: -1 | 1) {
    setPendingQuantity((current) =>
      roundQuantity(Math.min(100000, Math.max(0, current + direction * step))),
    );
  }

  function confirm() {
    if (!changed || saving) return;
    startTransition(async () => {
      const result = await adjustInventoryQuantity(item.id, delta);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBaseQuantity(result.quantity);
      setPendingQuantity(result.quantity);
      toast.success(t("inventory.quantityUpdated"));
      router.refresh();
    });
  }

  return (
    <div
      className={compact ? "mt-4 border-t border-[#e3e5de] pt-3" : "card mb-5 p-5"}
      aria-label={t("inventory.quantityAdjust")}
    >
      {!compact && <h2 className="text-xl">{t("inventory.quantityAdjust")}</h2>}
      <div className={`flex items-center ${compact ? "justify-between" : "mt-3 justify-start gap-3"}`}>
        <button
          type="button"
          className="rounded-lg border border-[#c8d0c9] bg-white p-2 disabled:opacity-40"
          aria-label={`${t("inventory.decreaseQuantity")} ${item.name}`}
          disabled={saving || pendingQuantity <= 0}
          onClick={() => adjust(-1)}
        >
          <Minus size={compact ? 15 : 18} />
        </button>
        <output className={compact ? "min-w-24 text-center text-sm font-bold" : "min-w-32 text-center font-bold"} aria-live="polite">
          {formatQuantityUnit(pendingQuantity, item.unit, locale)}
        </output>
        <button
          type="button"
          className="rounded-lg border border-[#c8d0c9] bg-white p-2 disabled:opacity-40"
          aria-label={`${t("inventory.increaseQuantity")} ${item.name}`}
          disabled={saving || pendingQuantity >= 100000}
          onClick={() => adjust(1)}
        >
          <Plus size={compact ? 15 : 18} />
        </button>
      </div>
      {changed && (
        <div className={`mt-3 flex gap-2 ${compact ? "justify-end" : "justify-start"}`}>
          <button type="button" className="btn-primary !px-3 !py-2 text-sm" disabled={saving} onClick={confirm}>
            {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}
            {t("inventory.confirmQuantity")}
          </button>
          <button
            type="button"
            className="btn-secondary !px-3 !py-2 text-sm"
            disabled={saving}
            onClick={() => setPendingQuantity(baseQuantity)}
          >
            <X size={16} />
            {t("inventory.cancelQuantity")}
          </button>
        </div>
      )}
    </div>
  );
}
