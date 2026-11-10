import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated } from "@/lib/api";

const input = z.object({
  items: z.array(z.object({
    inventoryItemId: z.string().uuid(),
    quantity: z.number().positive().max(100_000),
    unit: z.string().min(1).max(30),
  })).min(1).max(30),
}).superRefine(({ items }, context) => {
  if (new Set(items.map((item) => item.inventoryItemId)).size !== items.length) {
    context.addIssue({ code: "custom", message: "Duplicate inventory items" });
  }
});

export async function POST(request: Request) {
  const auth = await authenticated("cook", 10);
  if ("response" in auth) return auth.response;
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ingredient quantities" }, { status: 400 });
  }

  const ids = parsed.data.items.map((item) => item.inventoryItemId);
  const { data: inventory, error: inventoryError } = await auth.supabase
    .from("inventory_items")
    .select("id,quantity,unit,status")
    .eq("user_id", auth.user.id)
    .in("id", ids);
  if (inventoryError || inventory?.length !== ids.length) {
    return NextResponse.json({ error: "One or more inventory items are unavailable." }, { status: 409 });
  }

  const inventoryById = new Map(inventory.map((item) => [item.id, item]));
  const deductions = parsed.data.items.map((item) => {
    const current = inventoryById.get(item.inventoryItemId);
    if (!current || current.status !== "available" || item.quantity > Number(current.quantity)) return null;
    return {
      inventoryItemId: item.inventoryItemId,
      quantity: item.quantity,
      unit: current.unit,
    };
  });
  if (deductions.some((item) => item === null)) {
    return NextResponse.json({ error: "Adjust the amount to the currently available inventory." }, { status: 409 });
  }

  const { error } = await auth.supabase.rpc("record_recipe_usage", {
    p_items: deductions,
  });
  if (error) {
    return NextResponse.json({ error: "Could not update inventory. Check available quantities." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
