import "server-only";
import { z } from "zod";
import { lineUserIdSchema } from "./identity";

const profileResponseSchema = z.object({ userId: lineUserIdSchema });
const friendshipResponseSchema = z.object({ friendFlag: z.boolean() });

/**
 * Reads the friendship status for the LINE account that is linked to the
 * signed-in user. The client-supplied token is only trusted when LINE reports
 * that it belongs to that same LINE user; otherwise the status stays unknown.
 */
export async function getLineFriendshipStatus(providerToken: string, expectedLineUserId: string) {
  if (providerToken.length < 20 || providerToken.length > 4096) return "unknown" as const;
  const request = {
    headers: { Authorization: `Bearer ${providerToken}` },
    cache: "no-store" as const,
  };

  const profileResponse = await fetch("https://api.line.me/v2/profile", {
    ...request,
    signal: AbortSignal.timeout(10_000),
  });
  if (!profileResponse.ok) return "unknown" as const;
  const profile = profileResponseSchema.safeParse(await profileResponse.json());
  if (!profile.success || profile.data.userId !== expectedLineUserId) return "unknown" as const;

  const response = await fetch("https://api.line.me/friendship/v1/status", {
    ...request,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return "unknown" as const;
  const parsed = friendshipResponseSchema.safeParse(await response.json());
  if (!parsed.success) return "unknown" as const;
  return parsed.data.friendFlag ? "friend" as const : "not_friend" as const;
}
