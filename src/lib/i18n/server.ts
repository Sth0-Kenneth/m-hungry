import "server-only";

import { cookies } from "next/headers";
import {
  dictionaries,
  isLocale,
  translate,
  type Locale,
  type TranslationKey,
} from "./dictionaries";

export const LOCALE_COOKIE = "foodtrack-locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
}

export async function getI18n() {
  const locale = await getLocale();
  const dictionary = dictionaries[locale];
  return {
    locale,
    dictionary,
    t: (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(dictionary, key, values),
  };
}
