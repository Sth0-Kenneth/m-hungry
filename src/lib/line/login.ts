import "server-only";

import { z } from "zod";

const friendshipResponseSchema = z.object({ friendFlag: z.boolean() });

export async function getLineFriendshipStatus(providerToken: string) {
  if (providerToken.length < 20 || providerToken.length > 4096) return "unknown" as const;
  const response = await fetch("https://api.line.me/friendship/v1/status", {
    headers: { Authorization: `Bearer ${providerToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return "unknown" as const;
  const parsed = friendshipResponseSchema.safeParse(await response.json());
  if (!parsed.success) return "unknown" as const;
  return parsed.data.friendFlag ? "friend" as const : "not_friend" as const;
}
