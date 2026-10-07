import "server-only";

import { randomUUID } from "node:crypto";
import { serverEnv } from "@/lib/server-env";
import { lineUserIdSchema } from "./identity";

export class LineMessagingError extends Error {
  constructor(readonly status: number) {
    super(`LINE Messaging API request failed (${status})`);
    this.name = "LineMessagingError";
  }
}

export function isLineMessagingConfigured() {
  return Boolean(serverEnv.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN);
}

export async function sendLinePush(lineUserId: string, text: string) {
  const token = serverEnv.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) return { sent: false, reason: "not_configured" as const };
  const parsedUserId = lineUserIdSchema.safeParse(lineUserId);
  if (!parsedUserId.success) return { sent: false, reason: "invalid_user" as const };

  const normalizedText = text.trim().slice(0, 5_000);
  if (!normalizedText) return { sent: false, reason: "empty_message" as const };
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Line-Retry-Key": randomUUID(),
    },
    body: JSON.stringify({ to: parsedUserId.data, messages: [{ type: "text", text: normalizedText }] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new LineMessagingError(response.status);
  return { sent: true as const };
}
