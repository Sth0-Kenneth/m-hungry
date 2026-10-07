import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { lineUserIdSchema } from "@/lib/line/identity";
import { verifyLineWebhookSignature } from "@/lib/line/signature";

const webhookSchema = z.object({
  events: z.array(z.object({
    type: z.string(),
    source: z.object({ userId: lineUserIdSchema.optional() }).passthrough(),
  }).passthrough()).max(100),
}).passthrough();

export async function POST(request: Request) {
  const channelSecret = serverEnv.LINE_MESSAGING_CHANNEL_SECRET;
  if (!channelSecret) return NextResponse.json({ error: "LINE webhook is not configured." }, { status: 503 });
  const rawBody = await request.text();
  if (!verifyLineWebhookSignature(rawBody, request.headers.get("x-line-signature"), channelSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });

  const secret = serverEnv.SUPABASE_SERVICE_ROLE_KEY ?? serverEnv.SUPABASE_SECRET_KEY;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !secret) return NextResponse.json({ error: "Server database credentials are not configured." }, { status: 503 });
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  for (const event of parsed.data.events) {
    const lineUserId = event.source.userId;
    if (!lineUserId || (event.type !== "follow" && event.type !== "unfollow")) continue;
    const changes: {
      friend_status: "friend" | "blocked";
      messaging_enabled?: boolean;
      updated_at: string;
    } = {
      friend_status: event.type === "follow" ? "friend" : "blocked",
      updated_at: new Date().toISOString(),
    };
    if (event.type === "unfollow") changes.messaging_enabled = false;
    await supabase
      .from("line_connections")
      .update(changes)
      .eq("line_user_id", lineUserId);
  }
  return NextResponse.json({ ok: true });
}
