create table if not exists public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	username text not null unique check (char_length(username) >= 3),
	full_name text,
	avatar_url text,
	website text
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = timezone('utc', now());
	return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

alter table public.profiles enable row level security;

create policy "insert-own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "select-own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "update-own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

comment on table public.profiles is
'Example profile table with RLS for Supabase auth users. With Clerk-issued JWTs, replace auth.uid() with a claim check like (auth.jwt() ->> ''sub'').';

comment on policy "select-own" on public.profiles is
'With Clerk, use a JWT subject claim comparison such as (auth.jwt() ->> ''sub'') = id::text.';

comment on policy "update-own" on public.profiles is
'With Clerk, use a JWT subject claim comparison such as (auth.jwt() ->> ''sub'') = id::text.';
