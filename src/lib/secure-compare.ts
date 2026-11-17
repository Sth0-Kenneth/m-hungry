import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time string comparison (hashing first makes the lengths equal). */
export function secureEquals(received: string | null | undefined, expected: string) {
  if (typeof received !== "string") return false;
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
