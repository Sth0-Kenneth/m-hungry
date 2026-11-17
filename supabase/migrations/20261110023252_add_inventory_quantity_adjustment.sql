create or replace function public.adjust_inventory_quantity(
  p_inventory_item_id uuid,
  p_delta numeric
)
returns table(quantity numeric, status public.inventory_status)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_inventory public.inventory_items%rowtype;
  v_new_quantity numeric;
  v_new_status public.inventory_status;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_delta is null
    or p_delta = 0
    or p_delta <> round(p_delta, 3)
    or abs(p_delta) > 100000 then
    raise exception 'invalid quantity adjustment' using errcode = '22023';
  end if;

  select *
  into v_inventory
  from public.inventory_items
  where id = p_inventory_item_id
    and user_id = (select auth.uid())
    and status = 'available'
  for update;

  if not found then
    raise exception 'inventory item not found' using errcode = 'P0002';
  end if;

  v_new_quantity := v_inventory.quantity + p_delta;

  if v_new_quantity < 0 or v_new_quantity > 100000 then
    raise exception 'quantity is outside the allowed range' using errcode = '23514';
  end if;

  v_new_status := case
    when v_new_quantity = 0 then 'finished'::public.inventory_status
    else 'available'::public.inventory_status
  end;

  update public.inventory_items
  set quantity = v_new_quantity,
      status = v_new_status,
      updated_at = now()
  where id = v_inventory.id;

  insert into public.usage_logs(
    user_id,
    inventory_item_id,
    action,
    quantity,
    unit,
    estimated_value,
    note
  ) values (
    (select auth.uid()),
    v_inventory.id,
    'correction',
    abs(p_delta),
    v_inventory.unit,
    coalesce(v_inventory.unit_price, 0) * abs(p_delta),
    case when p_delta > 0 then 'Quantity increased' else 'Quantity decreased' end
  );

  return query select v_new_quantity, v_new_status;
end;
$$;

revoke all on function public.adjust_inventory_quantity(uuid, numeric) from public, anon;
grant execute on function public.adjust_inventory_quantity(uuid, numeric) to authenticated;
