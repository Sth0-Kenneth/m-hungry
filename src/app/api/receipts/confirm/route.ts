import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { receiptAiSchema } from "@/lib/validation";
import { getI18n } from "@/lib/i18n/server";
import { normalizeInventoryMeasurement } from "@/lib/business/units";

const schema = receiptAiSchema.extend({
  imagePath: z.string().min(5).max(500),
  rawOcrText: z.string().trim().min(8).max(30_000),
});

export async function POST(request: Request) {
  const { t, locale } = await getI18n();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: t("receipt.authRequired") }, { status: 401 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success || !parsed.data.imagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: t("receipt.invalidFields") }, { status: 400 });
    }
    const receipt = parsed.data;
    const items = receipt.items.map((item) => {
      const normalized = normalizeInventoryMeasurement({
        name: `${item.normalizedName} ${item.rawName}`,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
      }, locale);
      return { ...item, quantity: normalized.quantity, unit: normalized.unit };
    });
    const { data, error } = await supabase.rpc("confirm_receipt", {
      p_image_path: receipt.imagePath,
      p_store_name: receipt.storeName,
      p_purchase_date: receipt.purchaseDate,
      p_currency: receipt.currency,
      p_subtotal: receipt.subtotal,
      p_tax: receipt.tax,
      p_total: receipt.total,
      p_raw_ocr_text: receipt.rawOcrText,
      p_items: items,
    });
    if (error) {
      console.error("Receipt confirmation failed", error.code);
      return NextResponse.json({ error: t("receipt.saveFailed") }, { status: 500 });
    }
    return NextResponse.json({ purchaseId: data });
  } catch {
    return NextResponse.json({ error: t("receipt.saveFailed") }, { status: 500 });
  }
}
