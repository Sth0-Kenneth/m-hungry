-- Security hardening: stop users from creating rows that reference records
-- owned by someone else.
--
-- RLS insert policies only check `user_id = auth.uid()`, and foreign-key checks
-- bypass RLS. Before this migration a user could, for example, insert a
-- notification pointing at another user's inventory item and occupy the
-- unique (inventory_item_id, reminder_days, scheduled_for) slot so the
-- reminder job silently skipped the real owner.

-- 1. Notifications are created only by the server (service role). Signed-in
--    users may read their own notifications and mark them as read.
drop policy if exists notifications_insert on public.notifications;
drop policy if exists notifications_delete on public.notifications;
revoke insert, update, delete, truncate on table public.notifications from anon, authenticated;
grant update (read_at) on table public.notifications to authenticated;

-- 2. Remove any existing rows that already point at another user's records.
update public.purchases c set receipt_id = null
where receipt_id is not null
  and not exists (select 1 from public.receipts p where p.id = c.receipt_id and p.user_id = c.user_id);

delete from public.purchase_items c
where not exists (select 1 from public.purchases p where p.id = c.purchase_id and p.user_id = c.user_id);

update public.inventory_items c set purchase_item_id = null
where purchase_item_id is not null
  and not exists (select 1 from public.purchase_items p where p.id = c.purchase_item_id and p.user_id = c.user_id);

update public.usage_logs c set inventory_item_id = null
where inventory_item_id is not null
  and not exists (select 1 from public.inventory_items p where p.id = c.inventory_item_id and p.user_id = c.user_id);

delete from public.notifications c
where inventory_item_id is not null
  and not exists (select 1 from public.inventory_items p where p.id = c.inventory_item_id and p.user_id = c.user_id);

-- 3. Owner-aware foreign keys: a child row can only reference a parent row
--    with the same user_id. `on delete set null (col)` keeps user_id intact.
alter table public.receipts add constraint receipts_id_user_id_key unique (id, user_id);
alter table public.purchases add constraint purchases_id_user_id_key unique (id, user_id);
alter table public.purchase_items add constraint purchase_items_id_user_id_key unique (id, user_id);
alter table public.inventory_items add constraint inventory_items_id_user_id_key unique (id, user_id);

alter table public.purchases
  drop constraint if exists purchases_receipt_id_fkey,
  add constraint purchases_receipt_owner_fkey
    foreign key (receipt_id, user_id) references public.receipts (id, user_id)
    on delete set null (receipt_id);

alter table public.purchase_items
  drop constraint if exists purchase_items_purchase_id_fkey,
  add constraint purchase_items_purchase_owner_fkey
    foreign key (purchase_id, user_id) references public.purchases (id, user_id)
    on delete cascade;

alter table public.inventory_items
  drop constraint if exists inventory_items_purchase_item_id_fkey,
  add constraint inventory_items_purchase_item_owner_fkey
    foreign key (purchase_item_id, user_id) references public.purchase_items (id, user_id)
    on delete set null (purchase_item_id);

alter table public.usage_logs
  drop constraint if exists usage_logs_inventory_item_id_fkey,
  add constraint usage_logs_inventory_item_owner_fkey
    foreign key (inventory_item_id, user_id) references public.inventory_items (id, user_id)
    on delete set null (inventory_item_id);

alter table public.notifications
  drop constraint if exists notifications_inventory_item_id_fkey,
  add constraint notifications_inventory_item_owner_fkey
    foreign key (inventory_item_id, user_id) references public.inventory_items (id, user_id)
    on delete cascade;
