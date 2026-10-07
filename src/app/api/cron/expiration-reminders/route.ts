import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { adminMessaging } from "@/lib/firebase-admin";
import { getSiteUrl } from "@/lib/site-url";
import { isLineMessagingConfigured, sendLinePush } from "@/lib/line/messaging";

async function run(request: Request) {
  if (!serverEnv.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = serverEnv.SUPABASE_SERVICE_ROLE_KEY ?? serverEnv.SUPABASE_SECRET_KEY;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !secret) {
    return NextResponse.json({ error: "Server database credentials are not configured" }, { status: 503 });
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const last = new Date(today);
  last.setUTCDate(last.getUTCDate() + 7);
  const { data: items, error } = await supabase
    .from("inventory_items")
    .select("id,user_id,name,expiration_date")
    .eq("status", "available")
    .gte("expiration_date", today.toISOString().slice(0, 10))
    .lte("expiration_date", last.toISOString().slice(0, 10));
  if (error) return NextResponse.json({ error: "Reminder query failed" }, { status: 500 });

  let created = 0;
  let pushSent = 0;
  let lineSent = 0;
  const messaging = adminMessaging();

  for (const item of items ?? []) {
    const expiry = new Date(`${item.expiration_date}T00:00:00Z`);
    const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
    const [{ data: settings }, { data: lineConnection }] = await Promise.all([
      supabase
        .from("user_settings")
        .select("reminder_days,push_enabled")
        .eq("user_id", item.user_id)
        .maybeSingle(),
      isLineMessagingConfigured()
        ? supabase
            .from("line_connections")
            .select("line_user_id,messaging_enabled,friend_status")
            .eq("user_id", item.user_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!settings?.reminder_days?.includes(days)) continue;

    const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    const title = `${item.name} expires ${when}`;
    const message = `Use ${item.name} soon. Check its smell, appearance, and storage conditions before eating.`;
    const canSendFcm = Boolean(settings.push_enabled && messaging);
    const canSendLine = Boolean(
      lineConnection?.messaging_enabled && lineConnection.friend_status === "friend",
    );
    const { data: notification, error: insertError } = await supabase
      .from("notifications")
      .upsert(
        {
          user_id: item.user_id,
          inventory_item_id: item.id,
          notification_type: "expiration",
          title,
          message,
          scheduled_for: today.toISOString(),
          reminder_days: days,
          delivery_status: canSendFcm || canSendLine ? "pending" : "in_app",
        },
        {
          onConflict: "inventory_item_id,reminder_days,scheduled_for",
          ignoreDuplicates: true,
        },
      )
      .select("id")
      .maybeSingle();
    if (insertError || !notification) continue;
    created += 1;

    let itemSent = 0;
    if (canSendFcm && messaging) {
      const { data: subscriptions } = await supabase
        .from("notification_subscriptions")
        .select("id,token")
        .eq("user_id", item.user_id)
        .eq("enabled", true);
      for (const subscription of subscriptions ?? []) {
        try {
          await messaging.send({
            token: subscription.token,
            notification: { title, body: message },
            webpush: { fcmOptions: { link: `${getSiteUrl()}/dashboard` } },
          });
          pushSent += 1;
          itemSent += 1;
        } catch {
          await supabase.from("notification_subscriptions").update({ enabled: false }).eq("id", subscription.id);
        }
      }
    }

    if (canSendLine && lineConnection?.line_user_id) {
      try {
        await sendLinePush(
          lineConnection.line_user_id,
          `${title}\n${message}\n${getSiteUrl()}/inventory/${item.id}`,
        );
        lineSent += 1;
        itemSent += 1;
        await supabase
          .from("line_connections")
          .update({ last_delivery_at: new Date().toISOString() })
          .eq("user_id", item.user_id);
      } catch {
        // Keep the in-app notification even if an external provider is unavailable.
      }
    }

    if (canSendFcm || canSendLine) {
      await supabase
        .from("notifications")
        .update({
          sent_at: itemSent ? new Date().toISOString() : null,
          delivery_status: itemSent ? "sent" : "failed",
        })
        .eq("id", notification.id);
    }
  }

  return NextResponse.json({ ok: true, created, pushSent, lineSent });
}

export const POST = run;
export const GET = run;
