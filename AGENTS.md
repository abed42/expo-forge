# expo-forge — agent guide

Production-grade template for Expo apps. Bun workspaces + Turborepo monorepo. One app (`apps/mobile`), vendor-quarantine packages (`packages/*`), publishable CLI at the repo root (`scripts/` → `dist/`, npm name `create-expo-forge`).

## Commands

- `bun install` — always bun, never npm/yarn/pnpm. `bunfig.toml` forces the hoisted linker (Metro cannot resolve through bun's isolated store — do not remove).
- `bunx turbo lint typecheck test` — the full gate; CI runs exactly this. All three must be green before any commit.
- Per package: `bunx vitest run` (83+ tests), `bunx tsc --noEmit`, `bunx biome check --write <paths>`.
- Expo app root: `apps/mobile`. Run `bun expo start`, `bun ios`, `bun android`, `bunx expo-doctor`, and all `eas` commands from there. Development builds only; this template does not run in Expo Go (native deps: Unistyles/Nitro, ClerkKit, Sentry, RevenueCat).
- CLI: `bunx tsup` builds `scripts/index.ts` → `dist/index.js`. Test locally: `node dist/index.js init test-app --template <this-repo-path> --yes ...` (see `--help` for non-interactive flags).

## Using this CLI as an agent

For agents inside this template repo exercising the scaffold flow end-to-end (this section is stripped from scaffolded apps):

- Build first (`bunx tsup`), then run from a temp dir (the scaffold lands in cwd): `node dist/index.js init test-app --template <this-repo-path> --json --skip-optional`. Note: the local-template path clones committed HEAD — commit before testing template-content changes.
- `--json` implies non-interactive: no prompts, no clack UI; missing keys become `"skipped"`. The last line of stdout is exactly one JSON object — `{ ok, appName, directory, bundleId, keys, installed, pendingSteps }` on success, `{ ok: false, error, failedStep }` + exit 1 on failure. Warnings go to stderr.
- `pendingSteps` entries with `agentRunnable: false` are browser-auth/human steps (`clerk auth login`, `supabase login`, `eas init`, dashboard wiring) — relay them to your user; don't attempt them.
- Every scaffold also gets `NEXT_STEPS.md` (human-readable pendingSteps, grouped human-vs-agent) and a rewritten `AGENTS.md` via `scripts/scaffold-agents.ts` — anchor-exact string surgery like `scripts/vendors.ts` removalEdits. If you edit this file's title, intro paragraph, the CLI bullet above, the pins intro line, or the "Do not touch" section, update the matching anchors in `scripts/scaffold-agents.ts` or the transform will warn and skip.

## Version pins — read before touching any dependency

`tooling/pins.json` is the single source for native-coupled versions. Non-negotiable pins with reasons:
- `react-native-worklets` **exactly 0.10.0** (0.10.1 SIGABRTs; Expo's own bundled pin agrees)
- `react-native-reanimated` **^4.5.1, never 4.5.0** (crashes on empty Unistyles style objects) — deliberate `expo.install.exclude` silences expo-doctor
- `@shopify/flash-list` **exactly 2.0.2** (Expo SDK 57 bundled pin)
- Root `overrides` pin `react` and `react-dom` to the same exact version — `@clerk/react` peer-pulls a newer react-dom otherwise and React crashes on exact-version mismatch
- `@sentry/react-native` stays `~7.11.0` until getsentry/sentry-react-native#6384 closes

## Architecture rules

- **Vendor quarantine**: every third-party service lives behind `@repo/<vendor>` with `keys.ts` (zod schema), a provider/client entry, and inert-when-unset behavior (no key → no-op + at most ONE `console.info`; never throw, never warn-spam). App code never imports vendor SDKs directly (e.g. `useSignIn` comes from `@repo/auth`, not `@clerk/expo`). Native/runtime SDK versions are declared in `apps/mobile/package.json` for Expo tooling and consumed as peer dependencies by wrappers.
- **Env**: **only** `apps/mobile/.env.local` is loaded (Expo project root = `apps/mobile/`, next to `app.json`). Repo-root `.env*` is a trap — Metro ignores it. Template: `apps/mobile/.env.example` → copy to `apps/mobile/.env.local`. `EXPO_PUBLIC_*` only in client code; validated once at boot via `@repo/env` `composeEnv` in `apps/mobile/src/env.ts`. Metro statically inlines `process.env.EXPO_PUBLIC_X` member expressions — always read env via static member access; restart Metro after changing any `EXPO_PUBLIC_*` value. Real secrets live only in Supabase secrets / EAS env, never client files. Never commit `.env.local`; never put real values in `.env.example`.
- **Native lifecycle**: JavaScript changes need a Metro reload; `EXPO_PUBLIC_*` changes need a Metro restart; native dependency or config-plugin changes need a rebuilt development client (`cd apps/mobile && bun ios` / `bun android`). Metro cannot add a native module to an existing binary.
- **EAS**: `apps/mobile/eas.json`, `apps/mobile/.eas/workflows/`, and future `credentials.json` live in the Expo app root. Run EAS commands from `apps/mobile`; configure the Expo GitHub App base directory as `apps/mobile`.
- **Auth**: Clerk Core 3 result-object API (`signIn.emailCode.sendCode/verifyCode`, `finalize()` — methods return `{ error }`, they don't throw). Supabase runs in third-party-auth mode: the Clerk JWT rides every request via the `accessToken` getter; RLS policies key on `auth.jwt()->>'sub'`. Route gating is declarative `Stack.Protected` in `apps/mobile/src/app/_layout.tsx` — every unauthenticated screen MUST be declared inside the `!isSignedIn` guard or users get stranded on it after sign-in (this bug shipped once; don't reintroduce it).
- **Styling**: Unistyles v3 tokens only (`packages/design-system/src/tokens.ts`) — no hardcoded hex in app code (theme has `danger`, `accent`, etc.). `index.ts` imports unistyles config BEFORE `expo-router/entry`; that load order is correctness, not style. UI is deliberately grayscale; accent tokens exist but stay unused in the demo.
- **Glass**: all glass uses system APIs (`expo-glass-effect` GlassView, `@expo/ui` SwiftUI `glassEffect`) gated behind `isLiquidGlassAvailable()` with fill/hairline fallbacks. Never fake glass with translucent washes.
- **Icons**: SF Symbols need Android counterparts — NativeTabs icons take `sf` + `md` (Material) props; never ship an Apple private-use glyph (U+F8FF) in a cross-platform string.

## Env files (read this before editing keys)

| Path | Loaded by Expo? | Purpose |
| --- | --- | --- |
| `apps/mobile/.env.local` | **Yes** | Your real keys (gitignored) |
| `apps/mobile/.env.example` | No | Canonical empty template — copy from here |
| Repo-root `.env.example` | No | Pointer only — redirects to `apps/mobile/` |
| Repo-root `.env.local` | **No** | Do not use — Metro never reads it |

```sh
cp apps/mobile/.env.example apps/mobile/.env.local
# edit apps/mobile/.env.local, then restart Metro
```

## Generating env keys via CLIs (preferred over dashboard copy-paste)

Both required vendors can populate `apps/mobile/.env.local` from their CLIs:

```bash
# Clerk — writes EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY (run from apps/mobile)
clerk auth login
clerk link --app <app_id>        # or `clerk init` for a new Clerk app
clerk env pull
```
⚠️ `clerk env pull` also writes `CLERK_SECRET_KEY` (it assumes a server app). **Delete that line** — secrets never live in the client env. Verify with: `rg CLERK_SECRET_KEY apps/mobile/.env.local` → no match.

```bash
# Supabase — fetch the publishable key + project URL (run from packages/backend)
supabase login
supabase link --project-ref <ref>
supabase projects api-keys --project-ref <ref>   # copy the publishable key
# EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
# EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
```
Note: new Supabase projects issue `sb_publishable_…` keys (the legacy "anon" JWT is retired) — that value goes in `EXPO_PUBLIC_SUPABASE_KEY`. `supabase db push` from `packages/backend` applies migrations (0002 profiles/RLS, 0003 demo feed).

## Verification expectations

Every change: `tsc --noEmit` and `biome check` on touched surfaces, `vitest run` where the package has tests, and no new lint suppressions (the repo has zero — keep it that way; restructure instead). UI changes on iOS should be visually verified in the simulator; Android parity checks matter for safe-area (contentInsetAdjustmentBehavior is iOS-only) and icon sources.

## Do not touch without explicit instruction

`apps/mobile/.env.local` (user secrets), `tooling/pins.json` values, published npm metadata in root `package.json` (`name`, `bin`, `files`, `publishConfig`).
