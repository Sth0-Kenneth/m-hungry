import type { Locale } from "@/lib/i18n/dictionaries";

type Measurement = {
  name: string;
  category?: string | null;
  quantity: number;
  unit: string;
};

const liquidTerms = [
  "milk",
  "water",
  "juice",
  "tea",
  "coffee",
  "drink",
  "beverage",
  "cola",
  "soda",
  "oil",
  "soup",
  "broth",
  "sauce",
  "vinegar",
  "wine",
  "beer",
  "牛乳",
  "水",
  "ジュース",
  "お茶",
  "紅茶",
  "コーヒー",
  "飲料",
  "油",
  "スープ",
  "だし",
  "ソース",
  "ワイン",
  "ビール",
];

const sliceTerms = [
  "bread",
  "loaf",
  "toast",
  "cake",
  "食パン",
  "パン",
  "トースト",
  "ケーキ",
];

const sliceExclusions = ["breadcrumb", "bread crumb", "パン粉", "cake mix", "ケーキミックス"];

function includesTerm(value: string, terms: string[]) {
  const normalized = value.normalize("NFKC").toLocaleLowerCase();
  return terms.some((term) => {
    const normalizedTerm = term.toLocaleLowerCase();
    if (/^[a-z ]+$/.test(normalizedTerm)) {
      const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(normalized);
    }
    return normalized.includes(normalizedTerm);
  });
}

export function inventoryUnitKind(name: string, category?: string | null) {
  if (!includesTerm(name, sliceExclusions) && includesTerm(name, sliceTerms)) return "slice" as const;
  if (
    includesTerm(name, liquidTerms) ||
    ["beverages", "飲料"].includes((category ?? "").normalize("NFKC").toLocaleLowerCase())
  ) {
    return "liquid" as const;
  }
  return "other" as const;
}

export function suggestedInventoryUnit(
  name: string,
  category: string | null | undefined,
  locale: Locale,
  fallback: string,
) {
  const kind = inventoryUnitKind(name, category);
  if (kind === "liquid") return locale === "ja" ? "リットル" : "litre";
  if (kind === "slice") return locale === "ja" ? "枚" : "slice";
  return fallback;
}

export function normalizeInventoryMeasurement<T extends Measurement>(item: T, locale: Locale): T {
  const kind = inventoryUnitKind(item.name, item.category);
  const currentUnit = item.unit.normalize("NFKC").trim().toLocaleLowerCase();
  let quantity = item.quantity;

  if (kind === "liquid") {
    if (["ml", "millilitre", "millilitres", "ミリリットル"].includes(currentUnit)) quantity /= 1000;
    if (["cl", "centilitre", "centilitres", "センチリットル"].includes(currentUnit)) quantity /= 100;
    const volume = item.name.normalize("NFKC").match(/(\d+(?:\.\d+)?)\s*(ml|ミリリットル|l|リットル)/i);
    if (volume && !["ml", "millilitre", "millilitres", "ミリリットル", "cl", "centilitre", "centilitres", "センチリットル", "l", "litre", "litres", "liter", "liters", "リットル"].includes(currentUnit)) {
      const perContainer = volume[2].toLocaleLowerCase() === "ml" || volume[2] === "ミリリットル"
        ? Number(volume[1]) / 1000
        : Number(volume[1]);
      quantity *= perContainer;
    }
  }

  if (kind === "slice" && !["slice", "slices", "枚"].includes(currentUnit)) {
    const slices = item.name.normalize("NFKC").match(/(\d+)\s*(?:slices?|枚)/i);
    if (slices && ["loaf", "loaves", "pack", "packs", "bag", "bags", "斤", "袋", "パック"].includes(currentUnit)) {
      quantity *= Number(slices[1]);
    }
  }

  return {
    ...item,
    quantity: Math.round(quantity * 1000) / 1000,
    unit: suggestedInventoryUnit(item.name, item.category, locale, item.unit),
  };
}

export function quantityStep(unit: string) {
  const normalized = unit.normalize("NFKC").trim().toLocaleLowerCase();
  if (["slice", "slices", "piece", "pieces", "枚", "個", "pack", "packs"].includes(normalized)) {
    return 1;
  }
  if (["g", "gram", "grams", "ml", "millilitre", "millilitres", "ミリリットル"].includes(normalized)) {
    return 10;
  }
  if (["tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons", "大さじ", "小さじ"].includes(normalized)) {
    return 0.5;
  }
  return 0.1;
}

export function formatQuantityUnit(quantity: number, unit: string, locale: Locale) {
  const normalized = unit.normalize("NFKC").trim().toLocaleLowerCase();
  const amount = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    maximumFractionDigits: 3,
  }).format(quantity);

  if (["litre", "litres", "liter", "liters", "リットル"].includes(normalized)) {
    const label = locale === "ja" ? "リットル" : quantity === 1 ? "litre" : "litres";
    return `${amount} ${label}`;
  }
  if (["slice", "slices", "枚"].includes(normalized)) {
    const label = locale === "ja" ? "枚" : quantity === 1 ? "slice" : "slices";
    return `${amount} ${label}`;
  }
  return `${amount} ${unit}`;
}
