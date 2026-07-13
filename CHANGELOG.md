# Changelog

## 0.1.1 — 2026-07-12

The launch release. `create-expo-forge` now scaffolds from the pinned
release tag (`v0.1.1`) instead of the moving `main`, so installed CLIs are
immune to in-flight template changes.

### Fixed

- `composeEnv` treats empty-string env values as unset (t3-env's
  `emptyStringAsUndefined` semantics) — blank `KEY=` lines from
  `.env.example` copies or wizard-skipped keys no longer crash boot on
  `.optional()` validators.
- The init wizard's vendor manifest was missing `EXPO_PUBLIC_POSTHOG_HOST`;
  a new drift suite (`scripts/vendors.test.ts`) now diffs the manifest
  against every package's zod schema in CI.
- `.gitignore` covers `.env` and `.env.*` broadly (keeps `!.env.example`) —
  a filled-in `.env` was previously committable.
- Whole-repo Biome lint now runs in CI (previously only `apps/mobile` was
  linted); `packages/design-system` gained test/typecheck coverage.
- Scaffolded apps keep byte-stable, Biome-clean `turbo.json`/`package.json`
  (anchor surgery instead of JSON round-trips).

### Changed

- EAS config (`eas.json`, `.eas/workflows/`) lives in `apps/mobile/` per
  Expo monorepo conventions; native vendor SDKs are declared in the app
  manifest and consumed by `@repo/*` wrappers as peer dependencies.
- `@repo/payments` (RevenueCat) is wired into the app: env composition,
  boot configuration, and a paywall surface.

## 0.1.0 — 2026-07-08

Initial public release: Expo SDK 57 monorepo template (Bun + Turborepo),
Clerk auth (email code + Apple/Google SSO), Supabase backend with RLS
migrations and a Clerk-JWT third-party-auth client, Unistyles v3 design
system with adaptive dark mode and iOS 26 liquid glass, optional
PostHog/Sentry/RevenueCat (inert when unset), notifications, OTA updates,
and the `create-expo-forge` wizard with `--json` agent mode.
