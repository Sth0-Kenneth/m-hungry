import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE } from "@/lib/i18n/server";

const localeSchema = z.object({ locale: z.enum(["en", "ja"]) });

export async function POST(request: Request) {
  const parsed = localeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const store = await cookies();
  store.set(LOCALE_COOKIE, parsed.data.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
  });

  // Language choice works for visitors via the cookie and is also kept on the
  // authenticated profile so other clients can use the same preference later.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("profiles")
      .update({ language: parsed.data.locale })
      .eq("id", user.id);
  }

  return NextResponse.json({ locale: parsed.data.locale });
}
