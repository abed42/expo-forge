# clerk-webhook

Supabase Edge Function (Deno) that keeps `public.profiles` in sync with Clerk.

- Verifies every request's Svix signature with Web Crypto (HMAC-SHA256 over
  `${svix-id}.${svix-timestamp}.${body}` keyed by the decoded `whsec_` secret,
  with a 5-minute timestamp tolerance) — no npm `svix` dependency.
- `user.created` / `user.updated` → upsert into `public.profiles` (id, email,
  full_name, avatar_url) using the service-role key (bypasses RLS).
- `user.deleted` → deletes the row.
- Unknown event types are acknowledged with 200 so Clerk does not retry them.

## Deploy

From `packages/backend/` (the directory containing `supabase/`):

```sh
# Deploy WITHOUT Supabase JWT verification — Clerk signs requests with Svix,
# not with a Supabase JWT, so the platform-level check must be off.
supabase functions deploy clerk-webhook --no-verify-jwt

# Set the signing secret (value comes from the Clerk dashboard, step 3 below).
supabase secrets set CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into
every deployed edge function — no need to set them yourself.

## Clerk dashboard setup

1. Clerk dashboard → **Configure** → **Webhooks** → **Add Endpoint**.
2. Endpoint URL: `https://<project-ref>.supabase.co/functions/v1/clerk-webhook`.
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`.
4. Create the endpoint, then copy its **Signing Secret** (`whsec_...`) and set
   it as `CLERK_WEBHOOK_SIGNING_SECRET` via `supabase secrets set` (above).

## Verify it works

Sign up a new user in the app, then:

```sql
select * from public.profiles where id = '<clerk user id>';
```

A row keyed to the Clerk user id (`user_...`) should exist. You can also
replay deliveries and inspect responses from the Clerk dashboard's webhook
endpoint page (Message Attempts).
