"use client";

import { getExpirationState } from "@/lib/business/expiration";
import { useI18n } from "./locale-provider";

const colors = {
  expired: "bg-red-100 text-red-800",
  today: "bg-orange-100 text-orange-800",
  tomorrow: "bg-amber-100 text-amber-800",
  soon: "bg-yellow-100 text-yellow-800",
  safe: "bg-green-100 text-green-800",
  none: "bg-stone-100 text-stone-600",
};

export function ExpirationBadge({ date }: { date: string | null }) {
  const { t } = useI18n();
  const state = getExpirationState(date);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${colors[state]}`}>
      {t(`expiration.${state}`)}
    </span>
  );
}
