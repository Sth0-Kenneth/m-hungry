type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
};

const hits = new Map<string, { count: number; reset: number }>();

/**
 * In-memory limiter. Only used as a fallback when the shared database limiter
 * is unavailable, because each serverless instance has its own memory.
 */
export function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  if (hits.size > 10_000) {
    for (const [storedKey, entry] of hits) if (entry.reset < now) hits.delete(storedKey);
  }
  const found = hits.get(key);
  if (!found || found.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (found.count >= limit) return false;
  found.count++;
  return true;
}

/**
 * Rate limit shared by every server instance (counters live in Postgres via
 * the consume_rate_limit RPC, keyed by the signed-in user's id).
 */
export async function sharedRateLimit(
  supabase: RpcClient,
  bucket: string,
  userId: string,
  limit: number,
  windowSeconds: number,
) {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_window_seconds: windowSeconds,
  });
  if (error || typeof data !== "number") {
    console.error("Shared rate limit unavailable; using in-memory fallback", error?.code ?? "invalid response");
    return rateLimit(`${bucket}:${windowSeconds}:${userId}`, limit, windowSeconds * 1000);
  }
  return data <= limit;
}
