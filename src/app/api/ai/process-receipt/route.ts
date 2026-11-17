import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { consumeRequestLimits } from "@/lib/api";
import { extractReceipt } from "@/lib/ai/receipt";
import { GeminiRequestError } from "@/lib/ai/client";
import { getI18n } from "@/lib/i18n/server";

const input = z.object({
  imagePath: z.string().min(5).max(500),
  ocrText: z.string().trim().min(8).max(30_000),
  ocrConfidence: z.number().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  const { t, locale } = await getI18n();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: t("receipt.authRequired") }, { status: 401 });
    const limited = await consumeRequestLimits(supabase, user.id, "receipt", 5, true);
    if (limited !== "ok") {
      return NextResponse.json(
        { error: t(limited === "daily" ? "receipt.dailyLimited" : "receipt.rateLimited") },
        { status: 429 },
      );
    }
    const parsed = input.safeParse(await request.json());
    if (!parsed.success || !parsed.data.imagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: t("receipt.invalidPath") }, { status: 400 });
    }
    const { error } = await supabase.storage.from("receipts").createSignedUrl(parsed.data.imagePath, 60);
    if (error) return NextResponse.json({ error: t("receipt.imageNotFound") }, { status: 404 });
    const receipt = await extractReceipt(parsed.data.ocrText, locale);
    return NextResponse.json(receipt);
  } catch (reason) {
    console.error("Receipt processing failed", reason instanceof Error ? reason.message : "unknown");
    if (reason instanceof GeminiRequestError && reason.status === 429) {
      return NextResponse.json(
        { error: t("receipt.aiRateLimited") },
        {
          status: 429,
          headers: reason.retryAfter ? { "Retry-After": reason.retryAfter } : undefined,
        },
      );
    }
    return NextResponse.json({ error: t("receipt.unclear") }, { status: 502 });
  }
}
