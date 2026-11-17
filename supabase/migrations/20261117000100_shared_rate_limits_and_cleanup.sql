-- Security hardening, part 2.
--
-- 1. Shared rate limits. The previous limiter lived in server memory, so on
--    Vercel every serverless instance had its own counters and they reset on
--    each cold start. Counters now live in Postgres and are shared by all
--    instances.
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
-- No policies: the table is only reachable through consume_rate_limit().
revoke all on table public.rate_limits from public, anon, authenticated;

create or replace function public.consume_rate_limit(p_bucket text, p_window_seconds integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_key text;
  v_window timestamptz;
  v_hits integer;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_bucket is null or p_bucket !~ '^[a-z0-9-]{1,40}$'
    or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit request' using errcode = '22023';
  end if;

  -- The key always includes the caller's own user id, so a user can only
  -- ever spend their own budget.
  v_key := p_bucket || ':' || p_window_seconds || ':' || v_uid::text;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (key, window_start, hits)
  values (v_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  delete from public.rate_limits where key = v_key and window_start < v_window;
  return v_hits;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer) to authenticated;

-- 2. Remove the unused legacy RPC. It let a signed-in user set any remaining
--    quantity and status on their own items, skipping the app's checks.
drop function if exists public.record_inventory_usage(uuid, public.usage_action, numeric, text, text, numeric, numeric, public.inventory_status);

-- 3. Fix adjust_inventory_quantity: the OUT columns "quantity" and "status"
--    clashed with table columns ("column reference status is ambiguous"),
--    so every quantity +/- call failed. Table columns are now qualified.
create or replace function public.adjust_inventory_quantity(
  p_inventory_item_id uuid,
  p_delta numeric
)
returns table(quantity numeric, status public.inventory_status)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
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

  select i.*
  into v_inventory
  from public.inventory_items as i
  where i.id = p_inventory_item_id
    and i.user_id = (select auth.uid())
    and i.status = 'available'
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

  update public.inventory_items as i
  set quantity = v_new_quantity,
      status = v_new_status,
      updated_at = now()
  where i.id = v_inventory.id;

  insert into public.usage_logs(
    user_id, inventory_item_id, action, quantity, unit, estimated_value, note
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
