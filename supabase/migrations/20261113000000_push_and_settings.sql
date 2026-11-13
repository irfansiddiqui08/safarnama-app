-- =====================================================================
-- Push notifications + app settings (minimum app version)
-- =====================================================================

-- One row per phone that allowed notifications
create table public.push_tokens (
  token       text primary key,                   -- ExponentPushToken[...]
  user_id     uuid not null references auth.users on delete cascade,
  platform    text,
  updated_at  timestamptz not null default now()
);
create index on public.push_tokens (user_id);

-- History of what Humaira sent (shown in the admin panel)
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  audience    text not null check (audience in ('all','programme','email')),
  target      text,                                -- programme id or email
  url         text,                                -- screen to open on tap
  sent_count  integer not null default 0,
  failed_count integer not null default 0,
  created_by  uuid references auth.users on delete set null,
  created_at  timestamptz not null default now()
);

-- Simple key/value settings the app reads at start-up
create table public.app_settings (
  key    text primary key,
  value  text not null
);
insert into public.app_settings (key, value) values
  ('min_version_android', '1.0.0'),
  ('min_version_ios',     '1.0.0'),
  ('play_store_url',      'https://play.google.com/store/apps/details?id=club.safarnama.app'),
  ('app_store_url',       '')
on conflict (key) do nothing;

alter table public.push_tokens   enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings  enable row level security;

-- a student manages only their own phone's token; admin can read all
create policy "own push tokens" on public.push_tokens for all
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid());

create policy "admin notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());

-- settings: readable before login (the update check runs on the login screen too)
create policy "read settings" on public.app_settings for select to anon, authenticated using (true);
create policy "admin settings" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

-- Phones that should receive a notification (used by the send-push function with the service key)
create or replace function public.push_recipients(p_audience text, p_target text)
returns table (token text, user_id uuid)
language sql stable security definer set search_path = public as $$
  select t.token, t.user_id
  from public.push_tokens t
  join public.profiles pr on pr.id = t.user_id
  where (auth.uid() is null or public.is_admin())   -- only the server (service key) or an admin
    and case p_audience
    when 'all' then true
    when 'email' then pr.email = lower(p_target)
    when 'programme' then exists (
      select 1 from public.enrolments e join public.programmes p on p.id = e.programme_id
      where e.email = pr.email
        and (e.programme_id = p_target or p.is_bundle)
        and (e.valid_until is null or e.valid_until >= (now() at time zone 'Asia/Kolkata')::date))
    else false end;
$$;
revoke execute on function public.push_recipients(text, text) from public, anon, authenticated;
