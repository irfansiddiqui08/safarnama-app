-- =====================================================================
-- Admin emails: anyone on this list becomes an admin the first time they log in.
-- (No passwords needed — admins log in with an email code, like students.)
-- Add another admin later in the SQL Editor:
--   insert into public.admin_emails values ('someone@example.com');
--   update public.profiles set is_admin = true where email = 'someone@example.com';
-- =====================================================================
create table public.admin_emails (
  email text primary key check (email = lower(email))
);
alter table public.admin_emails enable row level security;
create policy "admin admin_emails" on public.admin_emails for all using (public.is_admin()) with check (public.is_admin());

insert into public.admin_emails (email) values ('humayrasheikh03@gmail.com') on conflict do nothing;

-- New logins: create the profile, marking listed emails as admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, lower(new.email), exists (select 1 from public.admin_emails a where a.email = lower(new.email)))
  on conflict (id) do nothing;
  return new;
end $$;

-- Anyone already logged in whose email is on the list
update public.profiles p set is_admin = true
where exists (select 1 from public.admin_emails a where a.email = p.email) and not p.is_admin;
