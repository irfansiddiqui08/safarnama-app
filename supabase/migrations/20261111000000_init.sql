-- =====================================================================
-- Safarnama Education app — database
-- Students only ever see the programmes they paid for, and a recording
-- only until its 24-hour window closes. These rules are enforced here in
-- the database (Row Level Security), not just in the app.
-- =====================================================================

-- ---------- profiles (one row per login) ----------
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text,
  phone       text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- helpers ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.my_email()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- ---------- programmes (the fee list on safarnama.club) ----------
create table public.programmes (
  id         text primary key,                 -- slug, e.g. 'chakra-healing'
  name       text not null,
  duration   text,
  fee_text   text,
  amount     integer not null default 0,       -- rupees
  is_bundle  boolean not null default false,   -- the Complete Course unlocks every programme
  access_days integer,                          -- null = no end date; 31 for monthly programmes (per payment)
  sort       integer not null default 100,
  active     boolean not null default true
);

-- ---------- batches ----------
create table public.batches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                    -- 'December 2026 Batch'
  starts_on  date not null,
  active     boolean not null default true
);

-- ---------- enrolments ----------
-- Keyed by email so Humaira (or the Razorpay webhook) can enrol someone
-- before they have ever opened the app.
create table public.enrolments (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (email = lower(email)),
  full_name     text,
  phone         text,
  programme_id  text not null references public.programmes on update cascade,
  batch_id      uuid references public.batches on delete set null,
  source        text not null default 'manual' check (source in ('manual','razorpay')),
  payment_id    text unique,
  amount_paid   integer,
  valid_until   date,                           -- null = no end date; set for monthly programmes
  created_at    timestamptz not null default now(),
  unique (email, programme_id, batch_id)
);
create index on public.enrolments (email);

-- Does the logged-in student have access to this programme right now?
create or replace function public.has_access(p_programme text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1
    from public.enrolments e
    join public.programmes p on p.id = e.programme_id
    where e.email = public.my_email()
      and (e.programme_id = p_programme or p.is_bundle)
      and (e.valid_until is null or e.valid_until >= (now() at time zone 'Asia/Kolkata')::date)
  );
$$;

-- ---------- live classes ----------
create table public.classes (
  id            uuid primary key default gen_random_uuid(),
  programme_id  text not null references public.programmes on update cascade,
  batch_id      uuid references public.batches on delete set null,
  title         text not null,
  starts_at     timestamptz not null,
  duration_min  integer not null default 90,
  zoom_url      text,
  zoom_passcode text,
  created_at    timestamptz not null default now()
);
create index on public.classes (starts_at);

-- ---------- recordings (each available for 24 hours) ----------
create table public.recordings (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references public.classes on delete cascade,
  bunny_video_id  text not null,
  title           text,
  available_until timestamptz not null,
  created_at      timestamptz not null default now()
);

-- Default window: 24 hours after the class ends.
create or replace function public.set_recording_window()
returns trigger language plpgsql as $$
declare c record;
begin
  if new.available_until is null then
    select starts_at, duration_min into c from public.classes where id = new.class_id;
    new.available_until := c.starts_at + make_interval(mins => c.duration_min) + interval '24 hours';
  end if;
  return new;
end $$;
create trigger recordings_window before insert on public.recordings
  for each row execute function public.set_recording_window();

-- ---------- devices (max 2 per student) ----------
create table public.devices (
  user_id    uuid not null references auth.users on delete cascade,
  device_id  text not null,
  label      text,
  last_seen  timestamptz not null default now(),
  primary key (user_id, device_id)
);

create or replace function public.limit_devices()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.devices where user_id = new.user_id) >= 2 then
    raise exception 'DEVICE_LIMIT' using hint = 'This account is already used on 2 devices. Contact Safarnama on WhatsApp to reset.';
  end if;
  return new;
end $$;
create trigger devices_limit before insert on public.devices
  for each row execute function public.limit_devices();

-- ---------- watch progress ----------
create table public.watch_progress (
  user_id       uuid not null references auth.users on delete cascade,
  recording_id  uuid not null references public.recordings on delete cascade,
  watched       boolean not null default false,
  updated_at    timestamptz not null default now(),
  primary key (user_id, recording_id)
);

-- ---------- Razorpay: payments the webhook could not match ----------
create table public.razorpay_map (
  match_key     text primary key,                -- Razorpay payment page id, or a word in the page title
  programme_id  text not null references public.programmes on update cascade
);
create table public.payments_unmatched (
  payment_id  text primary key,
  email       text,
  phone       text,
  amount      integer,
  raw         jsonb,
  created_at  timestamptz not null default now(),
  resolved    boolean not null default false
);

-- ---------- announcements (shown on the app home screen) ----------
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  message     text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles           enable row level security;
alter table public.programmes         enable row level security;
alter table public.batches            enable row level security;
alter table public.enrolments         enable row level security;
alter table public.classes            enable row level security;
alter table public.recordings         enable row level security;
alter table public.devices            enable row level security;
alter table public.watch_progress     enable row level security;
alter table public.razorpay_map       enable row level security;
alter table public.payments_unmatched enable row level security;
alter table public.announcements      enable row level security;

-- profiles
create policy "own profile read"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Students can edit their name/phone but never make themselves admin.
create or replace function public.protect_admin_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null in the Supabase SQL editor and for the service key: allowed.
  if new.is_admin is distinct from old.is_admin and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change admin access';
  end if;
  return new;
end $$;
create trigger profiles_protect_admin before update on public.profiles
  for each row execute function public.protect_admin_flag();
create policy "admin profiles"     on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- programmes, batches, announcements: readable by any logged-in user; admin writes
create policy "read programmes" on public.programmes for select to authenticated using (true);
create policy "admin programmes" on public.programmes for all using (public.is_admin()) with check (public.is_admin());
create policy "read batches" on public.batches for select to authenticated using (true);
create policy "admin batches" on public.batches for all using (public.is_admin()) with check (public.is_admin());
create policy "read announcements" on public.announcements for select to authenticated using (active or public.is_admin());
create policy "admin announcements" on public.announcements for all using (public.is_admin()) with check (public.is_admin());

-- enrolments: students see their own
create policy "own enrolments" on public.enrolments for select using (email = public.my_email() or public.is_admin());
create policy "admin enrolments" on public.enrolments for all using (public.is_admin()) with check (public.is_admin());

-- classes: only for programmes the student has access to
create policy "enrolled classes" on public.classes for select using (public.has_access(programme_id));
create policy "admin classes" on public.classes for all using (public.is_admin()) with check (public.is_admin());

-- recordings: enrolled AND still inside the 24-hour window
create policy "enrolled live recordings" on public.recordings for select using (
  public.is_admin() or (
    available_until > now()
    and exists (select 1 from public.classes c where c.id = class_id and public.has_access(c.programme_id))
  )
);
create policy "admin recordings" on public.recordings for all using (public.is_admin()) with check (public.is_admin());

-- devices: students manage their own; admin can reset
create policy "own devices" on public.devices for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- watch progress
create policy "own progress" on public.watch_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin progress read" on public.watch_progress for select using (public.is_admin());

-- razorpay tables: admin only (the webhook uses the service key)
create policy "admin map" on public.razorpay_map for all using (public.is_admin()) with check (public.is_admin());
create policy "admin unmatched" on public.payments_unmatched for all using (public.is_admin()) with check (public.is_admin());
