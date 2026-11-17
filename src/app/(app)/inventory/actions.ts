"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { inventorySchema } from "@/lib/validation";
import { getI18n } from "@/lib/i18n/server";

function value(form: FormData, key: string) {
  const result = String(form.get(key) ?? "").trim();
  return result || null;
}

function inventoryInput(form: FormData) {
  return {
    name: value(form, "name"),
    category: value(form, "category"),
    brand: value(form, "brand"),
    quantity: form.get("quantity"),
    unit: value(form, "unit"),
    purchase_date: value(form, "purchase_date"),
    expiration_date: value(form, "expiration_date"),
    expiration_source: value(form, "expiration_source"),
    opened_date: value(form, "opened_date"),
    storage_location: value(form, "storage_location"),
    unit_price: value(form, "unit_price"),
    notes: value(form, "notes"),
  };
}

export async function createItem(form: FormData) {
  const { t } = await getI18n();
  const parsed = inventorySchema.safeParse(inventoryInput(form));
  if (!parsed.success) throw new Error(t("form.invalidItem"));
  const { user, supabase } = await requireUser();
  const { error } = await supabase.from("inventory_items").insert({
    ...parsed.data,
    user_id: user.id,
    status: "available",
    estimated_value: parsed.data.unit_price,
  });
  if (error) throw new Error(t("form.saveFailed"));
  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateItem(id: string, form: FormData) {
  const { t } = await getI18n();
  const parsed = inventorySchema.safeParse(inventoryInput(form));
  if (!parsed.success) throw new Error(t("form.invalidItem"));
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("inventory_items")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(t("form.updateFailed"));
  revalidatePath(`/inventory/${id}`);
  revalidatePath("/inventory");
}

export async function deleteItem(id: string) {
  const { t } = await getI18n();
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(t("form.deleteFailed"));
  redirect("/inventory");
}

export async function markOpened(id: string) {
  const { user, supabase } = await requireUser();
  await supabase
    .from("inventory_items")
    .update({ opened_date: new Date().toISOString().slice(0, 10) })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath(`/inventory/${id}`);
}

const quantityAdjustmentSchema = z.object({
  id: z.string().uuid(),
  delta: z.number().finite().min(-100000).max(100000).refine((value) => value !== 0),
});

export type QuantityAdjustmentResult =
  | { ok: true; quantity: number }
  | { ok: false; error: string };

export async function adjustInventoryQuantity(
  id: string,
  requestedDelta: number,
): Promise<QuantityAdjustmentResult> {
  const { t } = await getI18n();
  const delta = Math.round(requestedDelta * 1000) / 1000;
  const parsed = quantityAdjustmentSchema.safeParse({ id, delta });
  if (!parsed.success) return { ok: false, error: t("inventory.quantityUpdateFailed") };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("adjust_inventory_quantity", {
    p_inventory_item_id: parsed.data.id,
    p_delta: parsed.data.delta,
  });

  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result) return { ok: false, error: t("inventory.quantityUpdateFailed") };

  revalidatePath(`/inventory/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/usage");
  return { ok: true, quantity: Number(result.quantity) };
}
