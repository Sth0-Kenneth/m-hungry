"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import type { InventoryItem } from "@/lib/types";
import { ExpirationBadge } from "./expiration-badge";
import { useI18n } from "./locale-provider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { formatQuantityUnit } from "@/lib/business/units";

export function InventoryCard({ item }: { item: InventoryItem }) {
  const { t, locale } = useI18n();
  const storageKey = `storage.${item.storage_location}` as TranslationKey;
  return (
    <Link href={`/inventory/${item.id}`} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">{item.name}</h2>
          <p className="mt-1 text-sm text-[#687970]">
            {item.brand || item.category || t("inventory.uncategorized")}
          </p>
        </div>
        <ExpirationBadge date={item.expiration_date} />
      </div>
      <div className="mt-5 flex items-center justify-between text-sm">
        <b>{formatQuantityUnit(Number(item.quantity), item.unit, locale)}</b>
        <span className="flex items-center gap-1 text-[#687970]">
          <MapPin size={14} />
          {t(storageKey)}
        </span>
      </div>
    </Link>
  );
}
