import { describe, expect, it } from "vitest";
import {
  formatQuantityUnit,
  normalizeInventoryMeasurement,
  quantityStep,
  suggestedInventoryUnit,
} from "./units";

describe("inventory units", () => {
  it("uses litres for liquids in the active language", () => {
    expect(suggestedInventoryUnit("Milk", "Dairy", "en", "bottle")).toBe("litre");
    expect(suggestedInventoryUnit("牛乳", "Dairy", "ja", "本")).toBe("リットル");
    expect(suggestedInventoryUnit("Steak", "Meat", "en", "piece")).toBe("piece");
  });

  it("converts explicit millilitres to litres", () => {
    expect(normalizeInventoryMeasurement({ name: "Orange juice", quantity: 500, unit: "ml" }, "en")).toMatchObject({ quantity: 0.5, unit: "litre" });
    expect(normalizeInventoryMeasurement({ name: "牛乳 500mL", quantity: 2, unit: "本" }, "ja")).toMatchObject({ quantity: 1, unit: "リットル" });
  });

  it("uses slices for bread and cake", () => {
    expect(normalizeInventoryMeasurement({ name: "Bread", quantity: 6, unit: "pieces" }, "en").unit).toBe("slice");
    expect(normalizeInventoryMeasurement({ name: "ケーキ", quantity: 2, unit: "個" }, "ja").unit).toBe("枚");
    expect(normalizeInventoryMeasurement({ name: "食パン 6枚", quantity: 1, unit: "パック" }, "ja")).toMatchObject({ quantity: 6, unit: "枚" });
    expect(normalizeInventoryMeasurement({ name: "パン粉", quantity: 1, unit: "袋" }, "ja").unit).toBe("袋");
  });

  it("formats plural units and chooses safe adjustment steps", () => {
    expect(formatQuantityUnit(2, "slice", "en")).toBe("2 slices");
    expect(formatQuantityUnit(1.5, "litre", "ja")).toBe("1.5 リットル");
    expect(quantityStep("slice")).toBe(1);
    expect(quantityStep("litre")).toBe(0.1);
  });
});
