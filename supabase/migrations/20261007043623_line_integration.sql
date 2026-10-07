create table public.line_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  line_user_id text not null unique,
  display_name text,
  picture_url text,
  messaging_enabled boolean not null default false,
  friend_status text not null default 'unknown',
  last_delivery_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint line_connections_line_user_id_format check (line_user_id ~ '^U[0-9a-f]{32}$'),
  constraint line_connections_display_name_length check (display_name is null or char_length(display_name) <= 200),
  constraint line_connections_picture_url_length check (picture_url is null or char_length(picture_url) <= 2048),
  constraint line_connections_friend_status check (friend_status in ('unknown', 'friend', 'not_friend', 'blocked'))
);

comment on table public.line_connections is
  'Links an authenticated mHungry user to a verified LINE OIDC identity for optional Messaging API reminders.';
comment on column public.line_connections.line_user_id is
  'Verified LINE subject. Login and Messaging channels must belong to the same LINE provider for push delivery.';

alter table public.line_connections enable row level security;

create policy "line_connections_select_own"
on public.line_connections
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "line_connections_insert_own"
on public.line_connections
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "line_connections_update_own"
on public.line_connections
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "line_connections_delete_own"
on public.line_connections
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.line_connections from anon, authenticated;
grant select on table public.line_connections to authenticated;
