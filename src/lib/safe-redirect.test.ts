import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/inventory/123?tab=a#top")).toBe("/inventory/123?tab=a#top");
  });

  it("falls back for missing or non-path values", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
    expect(safeNextPath("dashboard")).toBe("/dashboard");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("blocks open-redirect bypasses", () => {
    for (const attack of ["//evil.com", "/\\evil.com", "/\\/evil.com", "/\t/evil.com", "/\n/evil.com", "/%0a/evil.com"]) {
      const result = safeNextPath(attack);
      expect(new URL(result, "https://mhungry.app").origin).toBe("https://mhungry.app");
    }
    expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
  });
});
