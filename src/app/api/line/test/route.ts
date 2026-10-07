import { NextResponse } from "next/server";
import { authenticated } from "@/lib/api";
import { sendLinePush } from "@/lib/line/messaging";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const auth = await authenticated("line-test", 3);
  if ("response" in auth) return auth.response;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server database credentials are not configured." }, { status: 503 });
  const { data, error } = await admin
    .from("line_connections")
    .select("line_user_id,friend_status")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Connect a LINE account first." }, { status: 409 });
  if (data.friend_status !== "friend") return NextResponse.json({ error: "Add the LINE Official Account as a friend first." }, { status: 409 });

  try {
    const result = await sendLinePush(data.line_user_id, "mHungry LINE notifications are connected successfully.");
    if (!result.sent) return NextResponse.json({ error: "LINE Messaging API is not configured." }, { status: 503 });
    await admin.from("line_connections").update({ last_delivery_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", auth.user.id);
    return NextResponse.json({ ok: true });
  } catch (caught) {
    console.error("LINE test message failed", caught instanceof Error ? caught.message : "unknown");
    return NextResponse.json({ error: "LINE test message could not be delivered." }, { status: 502 });
  }
}
