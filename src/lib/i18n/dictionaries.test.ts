import { describe, expect, it } from "vitest";
import { dictionaries, isLocale, translate } from "./dictionaries";

describe("localization", () => {
  it("provides the same key set in English and Japanese", () => {
    expect(Object.keys(dictionaries.ja).sort()).toEqual(Object.keys(dictionaries.en).sort());
  });

  it("interpolates translated values", () => {
    expect(translate(dictionaries.en, "receipt.item", { number: 2 })).toBe("Item 2");
    expect(translate(dictionaries.ja, "receipt.item", { number: 2 })).toBe("商品 2");
  });

  it("accepts only supported locale values", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ja")).toBe(true);
    expect(isLocale("jp")).toBe(false);
  });
});
