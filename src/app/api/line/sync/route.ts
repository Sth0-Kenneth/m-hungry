import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated } from "@/lib/api";
import { extractLineIdentity } from "@/lib/line/identity";
import { getLineFriendshipStatus } from "@/lib/line/login";
import { createAdminClient } from "@/lib/supabase/admin";

const input = z.object({ providerToken: z.string().min(20).max(4096).optional() });

export async function POST(request: Request) {
  const auth = await authenticated("line-sync", 6);
  if ("response" in auth) return auth.response;
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid LINE connection request." }, { status: 400 });

  const identity = extractLineIdentity(auth.user);
  if (!identity) return NextResponse.json({ error: "A verified LINE identity is not linked to this account." }, { status: 409 });

  const friendStatus = parsed.data.providerToken
    ? await getLineFriendshipStatus(parsed.data.providerToken).catch(() => "unknown" as const)
    : "unknown" as const;
  const values: Record<string, unknown> = {
    user_id: auth.user.id,
    line_user_id: identity.lineUserId,
    display_name: identity.displayName,
    picture_url: identity.pictureUrl,
    updated_at: new Date().toISOString(),
  };
  if (friendStatus !== "unknown") values.friend_status = friendStatus;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server database credentials are not configured." }, { status: 503 });
  const { data, error } = await admin
    .from("line_connections")
    .upsert(values, { onConflict: "user_id" })
    .select("display_name,messaging_enabled,friend_status")
    .single();
  if (error) {
    console.error("LINE identity sync failed", error.code);
    return NextResponse.json({ error: "LINE account could not be connected." }, { status: 500 });
  }
  return NextResponse.json({ connected: true, connection: data }, { headers: { "Cache-Control": "private, no-store" } });
}
