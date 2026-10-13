import { describe, expect, it } from "vitest";
import { normalizeReceiptOcrText } from "./receipt";

describe("receipt OCR normalization", () => {
  it("normalizes full-width receipt text while preserving line structure", () => {
    expect(normalizeReceiptOcrText(" 牛乳　１Ｌ \r\n\r\n 合計   ￥９７４ \u0000")).toBe(
      "牛乳 1L\n合計 ¥974",
    );
  });

  it("removes empty lines and repeated horizontal whitespace", () => {
    expect(normalizeReceiptOcrText("Store\n  Apple\t\t2   300\n\nTotal 300")).toBe(
      "Store\nApple 2 300\nTotal 300",
    );
  });
});
