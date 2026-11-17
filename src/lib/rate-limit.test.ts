import { describe, expect, it, vi } from "vitest";
import { rateLimit, sharedRateLimit } from "./rate-limit";

describe("sharedRateLimit", () => {
  it("allows requests up to the limit using the database counter", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: 3, error: null }).mockResolvedValueOnce({ data: 4, error: null });
    expect(await sharedRateLimit({ rpc }, "recipes", "user-1", 3, 60)).toBe(true);
    expect(await sharedRateLimit({ rpc }, "recipes", "user-1", 3, 60)).toBe(false);
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", { p_bucket: "recipes", p_window_seconds: 60 });
  });

  it("falls back to the in-memory limiter when the RPC fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await sharedRateLimit({ rpc }, "fallback-test", "user-2", 1, 60)).toBe(true);
    expect(await sharedRateLimit({ rpc }, "fallback-test", "user-2", 1, 60)).toBe(false);
    error.mockRestore();
  });
});

describe("rateLimit", () => {
  it("blocks after the limit within the window", () => {
    expect(rateLimit("memory-test", 1, 60_000)).toBe(true);
    expect(rateLimit("memory-test", 1, 60_000)).toBe(false);
  });
});
