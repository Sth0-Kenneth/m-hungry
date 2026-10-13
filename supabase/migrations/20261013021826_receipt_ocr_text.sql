drop function if exists public.confirm_receipt(text, text, date, text, numeric, numeric, numeric, jsonb);

create function public.confirm_receipt(
  p_image_path text,
  p_store_name text,
  p_purchase_date date,
  p_currency text,
  p_subtotal numeric,
  p_tax numeric,
  p_total numeric,
  p_raw_ocr_text text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_receipt uuid;
  v_purchase uuid;
  v_item jsonb;
  v_purchase_item uuid;
begin
  if p_image_path not like auth.uid()::text || '/%' then
    raise exception 'invalid path';
  end if;
  if p_raw_ocr_text is null or char_length(btrim(p_raw_ocr_text)) < 8 or char_length(p_raw_ocr_text) > 30000 then
    raise exception 'invalid OCR text';
  end if;

  insert into public.receipts(
    user_id, image_path, store_name, purchase_date, currency, subtotal, tax,
    total_amount, raw_ocr_text
  )
  values (
    auth.uid(), p_image_path, p_store_name, p_purchase_date, p_currency,
    p_subtotal, p_tax, p_total, p_raw_ocr_text
  )
  returning id into v_receipt;

  insert into public.purchases(
    user_id, receipt_id, store_name, purchase_date, currency, total_amount
  )
  values (
    auth.uid(), v_receipt, p_store_name, p_purchase_date, p_currency, p_total
  )
  returning id into v_purchase;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.purchase_items(
      user_id, purchase_id, raw_name, normalized_name, category, quantity,
      unit, unit_price, total_price, added_to_inventory
    )
    values (
      auth.uid(), v_purchase, v_item->>'rawName', v_item->>'normalizedName',
      v_item->>'category', (v_item->>'quantity')::numeric, v_item->>'unit',
      nullif(v_item->>'unitPrice', '')::numeric,
      nullif(v_item->>'totalPrice', '')::numeric,
      coalesce((v_item->>'addToInventory')::boolean, false)
    )
    returning id into v_purchase_item;

    if coalesce((v_item->>'addToInventory')::boolean, false) then
      insert into public.inventory_items(
        user_id, purchase_item_id, name, category, quantity, unit,
        purchase_date, expiration_source, storage_location, unit_price,
        estimated_value
      )
      values (
        auth.uid(), v_purchase_item, v_item->>'normalizedName',
        v_item->>'category', (v_item->>'quantity')::numeric, v_item->>'unit',
        p_purchase_date, 'unknown', 'refrigerator',
        nullif(v_item->>'unitPrice', '')::numeric,
        nullif(v_item->>'totalPrice', '')::numeric
      );
    end if;
  end loop;

  return v_purchase;
end;
$$;

revoke all on function public.confirm_receipt(text, text, date, text, numeric, numeric, numeric, text, jsonb) from public, anon;
grant execute on function public.confirm_receipt(text, text, date, text, numeric, numeric, numeric, text, jsonb) to authenticated;

-- This trigger function must remain SECURITY DEFINER so Auth can create the
-- matching profile/settings rows, but it is not a public RPC endpoint.
revoke all on function public.handle_new_user() from public, anon, authenticated;
