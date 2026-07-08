-- 0002_clerk_rls.sql — profiles keyed to Clerk identity (Supabase third-party auth)
--
-- Replaces the 0001 example table (which was keyed to Supabase Auth's
-- auth.users) with a profiles table keyed to the Clerk user id.
--
-- PREREQUISITE — one-time dashboard setup (RLS below is inert without it):
--   1. Clerk dashboard → Configure → Integrations → Supabase → activate the
--      integration. This adds the `role: "authenticated"` claim to Clerk
--      session tokens and shows the Clerk domain to paste into Supabase.
--   2. Supabase dashboard → Authentication → Sign In / Up → Third Party Auth →
--      Add provider → Clerk → enter your Clerk domain
--      (e.g. https://your-app.clerk.accounts.dev).
-- Once configured, Supabase's Data API accepts Clerk-issued JWTs and RLS can
-- read their claims via auth.jwt() — the `sub` claim is the Clerk user id,
-- which is exactly what the policies below compare against.

drop table if exists public.profiles cascade;

create table public.profiles (
	-- Clerk user id from the JWT `sub` claim, e.g. 'user_2abc123...'.
	id text primary key,
	email text,
	full_name text,
	avatar_url text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- Keep updated_at fresh (function may already exist from 0001; idempotent).
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = timezone('utc', now());
	return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

alter table public.profiles enable row level security;

-- No insert/delete policies on purpose: rows are created, updated, and removed
-- by the Clerk webhook edge function (supabase/functions/clerk-webhook), which
-- uses the service-role key and therefore bypasses RLS.

create policy select_own
on public.profiles
for select
to authenticated
using (id = (select auth.jwt() ->> 'sub'));

create policy update_own
on public.profiles
for update
to authenticated
using (id = (select auth.jwt() ->> 'sub'))
with check (id = (select auth.jwt() ->> 'sub'));

comment on table public.profiles is
'User profiles keyed to the Clerk user id (JWT sub claim). Synced from Clerk by the clerk-webhook edge function; read/updated by clients through RLS on auth.jwt()->>''sub''. Requires Supabase third-party auth to be configured with Clerk (Authentication → Sign In / Up → Third Party Auth).';
