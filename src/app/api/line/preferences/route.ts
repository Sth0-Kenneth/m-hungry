import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

const input = z.object({ enabled: z.boolean() });

export async function POST(request: Request) {
  const auth = await authenticated("line-preferences", 10);
  if ("response" in auth) return auth.response;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid LINE preference." }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server database credentials are not configured." }, { status: 503 });
  const { data: connection, error: readError } = await admin
    .from("line_connections")
    .select("friend_status")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (readError || !connection) return NextResponse.json({ error: "Connect a LINE account first." }, { status: 409 });
  if (parsed.data.enabled && connection.friend_status !== "friend") {
    return NextResponse.json({ error: "Add the linked LINE Official Account as a friend before enabling messages." }, { status: 409 });
  }

  const { error } = await admin
    .from("line_connections")
    .update({ messaging_enabled: parsed.data.enabled, updated_at: new Date().toISOString() })
    .eq("user_id", auth.user.id);
  if (error) return NextResponse.json({ error: "LINE preferences could not be saved." }, { status: 500 });
  return NextResponse.json({ ok: true, enabled: parsed.data.enabled });
}
