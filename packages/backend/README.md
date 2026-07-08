# @repo/backend

Supabase, quarantined behind a stable import surface. Exposes a typed client
factory, Zod-validated env keys, SQL migrations, and a Clerk-sync edge
function. App code imports `@repo/backend` — never `@supabase/supabase-js`
directly — so the vendor stays swappable.

## Two auth models

Supabase supports two ways to authenticate Data API requests. This template
ships wired for the **second** one.

| | Supabase Auth | Third-party auth (Clerk — the template default) |
|---|---|---|
| Identity lives in | `auth.users`, sessions managed by supabase-js | Clerk; Supabase never has a session |
| Client config | `auth.storage` / `storageKey` persist the session | `accessToken` getter; auth storage is unused |
| RLS keys on | `auth.uid()` (uuid) | `auth.jwt() ->> 'sub'` (Clerk user id, text) |
| `supabase.auth.*` | Works | Throws — identity is Clerk's job |

`createSupabaseClient()` with no options gives you the plain publishable-key
client (Supabase Auth mode, session persisted only if you pass `storage`).
Passing `accessToken` flips it into third-party mode — the two sets of options
are mutually exclusive, and `storage`/`storageKey` are ignored in that mode.

## The accessToken flow (Clerk → Supabase)

```
useAuth().getToken ──▶ useSupabase(getToken) ──▶ createClerkSupabaseClient
                                                        │
                    every request: Authorization: Bearer <Clerk session JWT>
                                                        ▼
                              Supabase Data API ──▶ RLS reads auth.jwt()->>'sub'
```

- `createClerkSupabaseClient(getToken)` — vendor-agnostic factory: this
  package never imports `@repo/auth`; the app injects the getter.
- `useSupabase(getToken)` — React hook that creates the client once per mount
  and keeps the getter fresh through a ref (Clerk's `getToken` changes
  identity every render; the client must not).
- App wiring lives in `apps/mobile/src/lib/supabase.ts`:

```ts
import { useAuth } from "@repo/auth";
import { useSupabase } from "@repo/backend";

export function useSupabaseClient() {
	const { getToken } = useAuth();
	return useSupabase(getToken);
}
```

When no user is signed in, `getToken` resolves `null` and supabase-js falls
back to the publishable key — public reads still work.

## RLS on the Clerk `sub` claim

`supabase/migrations/0002_clerk_rls.sql` creates `public.profiles` keyed to
the Clerk user id (`id text primary key` = JWT `sub`), with RLS enabled and
owner-only policies:

```sql
using (id = (select auth.jwt() ->> 'sub'))
```

There are deliberately **no insert/delete policies** for clients — rows are
managed by the webhook (below) with the service-role key, which bypasses RLS.

## Webhook user sync (Clerk → profiles)

`supabase/functions/clerk-webhook/` is a Deno edge function that verifies
Clerk's Svix signature (hand-rolled HMAC, dependency-free) and mirrors
`user.created` / `user.updated` / `user.deleted` into `public.profiles`.
Deploy steps and Clerk webhook configuration:
[`supabase/functions/clerk-webhook/README.md`](./supabase/functions/clerk-webhook/README.md).

The function targets the Deno runtime and is excluded from this package's
tsconfig (`include` covers `src/**` only) — React Native typechecking never
sees Deno globals.

## Required dashboard setup (both sides)

Third-party auth is a handshake; RLS stays inert until both dashboards agree.

**Clerk:**

1. **Configure → Integrations → Supabase** → activate. This adds the
   `role: "authenticated"` claim to Clerk session tokens (Supabase requires
   it) and displays your Clerk domain.
2. **Configure → Webhooks** → add the edge-function endpoint and subscribe to
   `user.created`, `user.updated`, `user.deleted` (details in the function
   README).

**Supabase:**

1. **Authentication → Sign In / Up → Third Party Auth → Add provider →
   Clerk** → paste the Clerk domain from step 1
   (e.g. `https://your-app.clerk.accounts.dev`).
2. Deploy the webhook function and set `CLERK_WEBHOOK_SIGNING_SECRET`
   (function README).
3. Apply migrations — `supabase db push` (or paste `supabase/migrations/*.sql`
   into the SQL editor). `0003_feed_items.sql` creates and seeds the public
   demo `feed_items` table the Home tab hydrates from; until it is applied the
   app falls back to skeleton placeholders.

## Env

| Key | Where | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | client (`src/keys.ts`) | project URL |
| `EXPO_PUBLIC_SUPABASE_KEY` | client (`src/keys.ts`) | publishable key (`sb_publishable_…`) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | edge function secret only | `whsec_…` — never in client env |
| `SUPABASE_SERVICE_ROLE_KEY` | injected into edge functions | never in client env |

## Scripts

- `bun run gen-types` — regenerate `src/database.types.ts` from the local
  Supabase instance.
- `bun run typecheck` — `tsc --noEmit` over `src/`.
