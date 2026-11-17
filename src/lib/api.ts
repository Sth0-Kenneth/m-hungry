import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sharedRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/server-env";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Applies the per-minute limit for one endpoint and, for AI endpoints, the
 * per-user daily AI quota shared by every AI feature (protects the Gemini bill).
 */
export async function consumeRequestLimits(
  supabase: ServerSupabase,
  userId: string,
  limitKey: string,
  limit: number,
  ai = false,
): Promise<"ok" | "minute" | "daily"> {
  if (!(await sharedRateLimit(supabase, limitKey, userId, limit, 60))) return "minute";
  if (ai && !(await sharedRateLimit(supabase, "ai-daily", userId, serverEnv.AI_DAILY_LIMIT, 86_400))) return "daily";
  return "ok";
}

export async function authenticated(limitKey: string, limit = 10, options: { ai?: boolean } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  const limited = await consumeRequestLimits(supabase, user.id, limitKey, limit, options.ai);
  if (limited === "minute") return { response: NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 }) } as const;
  if (limited === "daily") return { response: NextResponse.json({ error: "Daily AI limit reached. Try again tomorrow." }, { status: 429 }) } as const;
  return { user, supabase } as const;
}

export async function signedImageUrl(bucket: "receipts" | "food-images", path: string, userId: string, supabase: ServerSupabase) {
  if (!path.startsWith(`${userId}/`)) throw new Error("Invalid image path");
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (error) throw new Error("Image not found");
  return data.signedUrl;
}

export function externalFailure(message: string, status = 502) {
  return NextResponse.json({ error: message }, { status });
}
