create index if not exists recipes_user_created_idx on public.recipes(user_id, created_at desc);
create index if not exists subscriptions_user_enabled_idx on public.notification_subscriptions(user_id, enabled);
create index if not exists notifications_user_read_idx on public.notifications(user_id, read_at, created_at desc);

create or replace function public.record_recipe_usage(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_inventory public.inventory_items%rowtype;
  v_quantity numeric;
  v_remaining numeric;
begin
  if jsonb_array_length(p_items) > 30 then raise exception 'too many items'; end if;
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_inventory from public.inventory_items
      where id = (v_item->>'inventoryItemId')::uuid
        and user_id = auth.uid() and status = 'available'
      for update;
    if not found then raise exception 'inventory item not found'; end if;
    v_quantity := (v_item->>'quantity')::numeric;
    if v_quantity <= 0 or v_quantity > v_inventory.quantity then raise exception 'invalid quantity'; end if;
    v_remaining := v_inventory.quantity - v_quantity;
    insert into public.usage_logs(user_id,inventory_item_id,action,quantity,unit,estimated_value,note)
      values(auth.uid(),v_inventory.id,'cooked',v_quantity,coalesce(v_item->>'unit',v_inventory.unit),
        coalesce(v_inventory.unit_price,0) * v_quantity,'Recipe preparation');
    update public.inventory_items set quantity=v_remaining,
      status=case when v_remaining=0 then 'finished'::public.inventory_status else status end,
      updated_at=now() where id=v_inventory.id;
  end loop;
end;
$$;

revoke all on function public.record_recipe_usage(jsonb) from public, anon;
grant execute on function public.record_recipe_usage(jsonb) to authenticated;
