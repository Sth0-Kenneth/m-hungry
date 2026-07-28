"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, LoaderCircle } from "lucide-react";
import { useI18n } from "./locale-provider";
import type { Locale } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function change(nextLocale: Locale) {
    if (nextLocale === locale || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (!response.ok) throw new Error("Locale update failed");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border border-[#d9ded5] bg-white p-1"
      aria-label={t("language.label")}
    >
      {pending ? (
        <LoaderCircle className="mx-2 animate-spin text-[#527065]" size={16} />
      ) : (
        <Languages className="mx-1 text-[#527065]" size={16} aria-hidden />
      )}
      {(["en", "ja"] as const).map((value) => (
        <button
          type="button"
          key={value}
          aria-pressed={locale === value}
          onClick={() => void change(value)}
          className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
            locale === value
              ? "bg-[#174c37] text-white"
              : "text-[#53675e] hover:bg-[#edf3ea]"
          }`}
        >
          {compact
            ? value === "en"
              ? "EN"
              : "日本語"
            : t(value === "en" ? "language.english" : "language.japanese")}
        </button>
      ))}
    </div>
  );
}
