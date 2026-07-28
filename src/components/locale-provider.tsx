"use client";

import { createContext, useContext, useMemo } from "react";
import {
  translate,
  type Dictionary,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";

type I18nContextValue = {
  locale: Locale;
  dictionary: Dictionary;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LocaleProvider({
  locale,
  dictionary,
  children,
}: Pick<I18nContextValue, "locale" | "dictionary"> & {
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dictionary,
      t: (key, values) => translate(dictionary, key, values),
    }),
    [dictionary, locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LocaleProvider");
  return context;
}
