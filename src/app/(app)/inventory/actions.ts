"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { inventorySchema, usageSchema } from "@/lib/validation";
import { reduceQuantity } from "@/lib/business/inventory";
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
    barcode: value(form, "barcode"),
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
  const { error } = await supabase.from("inventory_items").update(parsed.data).eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(t("form.updateFailed"));
  revalidatePath(`/inventory/${id}`);
  revalidatePath("/inventory");
}

export async function deleteItem(id: string) {
  const { t } = await getI18n();
  const { user, supabase } = await requireUser();
  const { error } = await supabase.from("inventory_items").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(t("form.deleteFailed"));
  redirect("/inventory");
}

export async function markOpened(id: string) {
  const { user, supabase } = await requireUser();
  await supabase.from("inventory_items").update({ opened_date: new Date().toISOString().slice(0, 10) }).eq("id", id).eq("user_id", user.id);
  revalidatePath(`/inventory/${id}`);
}

export async function recordUsage(form: FormData) {
  const { t } = await getI18n();
  const parsed = usageSchema.safeParse({
    inventory_item_id: form.get("inventory_item_id"),
    action: form.get("action"),
    quantity: form.get("quantity"),
    unit: form.get("unit"),
    note: form.get("note"),
  });
  if (!parsed.success) throw new Error(t("form.invalidUsage"));
  const { user, supabase } = await requireUser();
  const { data: item } = await supabase.from("inventory_items").select("quantity,unit_price").eq("id", parsed.data.inventory_item_id).eq("user_id", user.id).single();
  if (!item) throw new Error(t("form.itemNotFound"));
  const { remaining, depleted } = reduceQuantity(Number(item.quantity), parsed.data.quantity);
  const status = parsed.data.action === "discarded" ? "discarded" : parsed.data.action === "donated" ? "donated" : depleted ? "finished" : "available";
  const estimated = (Number(item.unit_price) || 0) * parsed.data.quantity;
  const { error } = await supabase.rpc("record_inventory_usage", {
    p_inventory_item_id: parsed.data.inventory_item_id,
    p_action: parsed.data.action,
    p_quantity: parsed.data.quantity,
    p_unit: parsed.data.unit,
    p_note: parsed.data.note ?? null,
    p_estimated_value: estimated,
    p_remaining: remaining,
    p_status: status,
  });
  if (error) throw new Error(t("form.usageFailed"));
  revalidatePath("/inventory");
  revalidatePath("/usage");
}
