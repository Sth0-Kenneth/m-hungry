"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import type { InventoryItem } from "@/lib/types";
import { ExpirationBadge } from "./expiration-badge";
import { useI18n } from "./locale-provider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { InventoryQuantityControl } from "./inventory-quantity-control";

export function InventoryCard({ item }: { item: InventoryItem }) {
  const { t, locale } = useI18n();
  const storageKey = `storage.${item.storage_location}` as TranslationKey;
  return (
    <article className="card p-4 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/inventory/${item.id}`} className="rounded-sm hover:text-[#2f7658] focus-visible:outline-2 focus-visible:outline-offset-2">
            <h2 className="text-xl">{item.name}</h2>
          </Link>
          <p className="mt-1 text-sm text-[#687970]">
            {item.brand || item.category || t("inventory.uncategorized")}
          </p>
        </div>
        <ExpirationBadge date={item.expiration_date} />
      </div>
      <div className="mt-4 flex justify-end text-sm">
        <span className="flex items-center gap-1 text-[#687970]" lang={locale}>
          <MapPin size={14} />
          {t(storageKey)}
        </span>
      </div>
      <InventoryQuantityControl key={`${item.id}-${item.quantity}`} item={item} compact />
    </article>
  );
}
