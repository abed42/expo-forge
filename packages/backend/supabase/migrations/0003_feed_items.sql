-- 0003_feed_items.sql — public demo feed rendered by the Home tab
--
-- Deliberately PUBLIC data (readable by anon AND authenticated): the Home
-- feed must render real rows before the third-party-auth dashboard handshake
-- (0002's prerequisite) is complete, and even before a first sign-in exists.
-- Per-user, owner-scoped data patterns are what `profiles` (0002) demonstrates
-- — this table demonstrates the read-only public-content pattern instead.

create table public.feed_items (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	subtitle text,
	image_url text,
	created_at timestamptz default now()
);

alter table public.feed_items enable row level security;

-- Both roles on purpose: `anon` covers requests before/without a Clerk
-- session (supabase-js falls back to the publishable key), `authenticated`
-- covers requests carrying a Clerk JWT once third-party auth is configured.
create policy select_all
on public.feed_items
for select
to anon, authenticated
using (true);

-- No insert/update/delete policies: demo content is seeded here and managed
-- from the dashboard (service role bypasses RLS).

-- Seed rows. Staggered created_at keeps the feed's newest-first order stable.
insert into public.feed_items (title, subtitle, image_url, created_at) values
	(
		'Forged in the open',
		'What shipping a native-first template actually takes',
		'https://picsum.photos/seed/forge-1/900/1000',
		now()
	),
	(
		'The monochrome canvas',
		'Editorial restraint as a design system default',
		'https://picsum.photos/seed/forge-2/900/1000',
		now() - interval '1 hour'
	),
	(
		'No deploy but the binary',
		'Why the backend should never block an App Store submit',
		'https://picsum.photos/seed/forge-3/900/1000',
		now() - interval '2 hours'
	);

comment on table public.feed_items is
'Public demo feed for the template''s Home tab. RLS-enabled with a permissive select policy for anon and authenticated — intentionally world-readable demo content so the feed hydrates before any auth setup. See profiles (0002) for the owner-scoped RLS pattern.';
