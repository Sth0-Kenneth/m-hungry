import { describe, expect, it } from "vitest";
import { secureEquals } from "./secure-compare";

describe("secureEquals", () => {
  it("matches only identical strings", () => {
    expect(secureEquals("Bearer abcdefghijklmnop", "Bearer abcdefghijklmnop")).toBe(true);
    expect(secureEquals("Bearer abcdefghijklmnoq", "Bearer abcdefghijklmnop")).toBe(false);
    expect(secureEquals("short", "Bearer abcdefghijklmnop")).toBe(false);
    expect(secureEquals(null, "Bearer abcdefghijklmnop")).toBe(false);
  });
});
