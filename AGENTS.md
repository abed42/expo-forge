# expo-forge — agent guide

Production-grade template for Expo apps. Bun workspaces + Turborepo monorepo. One app (`apps/mobile`), vendor-quarantine packages (`packages/*`), publishable CLI at the repo root (`scripts/` → `dist/`, npm name `create-expo-forge`).

## Commands

- `bun install` — always bun, never npm/yarn/pnpm. `bunfig.toml` forces the hoisted linker (Metro cannot resolve through bun's isolated store — do not remove).
- `bunx turbo lint typecheck test` — the full gate; CI runs exactly this. All three must be green before any commit.
- Per package: `bunx vitest run` (83+ tests), `bunx tsc --noEmit`, `bunx biome check --write <paths>`.
- App: `cd apps/mobile && bun ios` / `bun android` — development builds only; this template does not run in Expo Go (native deps: Unistyles/Nitro, ClerkKit, Sentry, RevenueCat).
- CLI: `bunx tsup` builds `scripts/index.ts` → `dist/index.js`. Test locally: `node dist/index.js init test-app --template <this-repo-path> --yes ...` (see `--help` for non-interactive flags).

## Version pins — read before touching any dependency

`tooling/pins.json` is the single source for native-coupled versions. Non-negotiable pins with reasons:
- `react-native-worklets` **exactly 0.10.0** (0.10.1 SIGABRTs; Expo's own bundled pin agrees)
- `react-native-reanimated` **^4.5.1, never 4.5.0** (crashes on empty Unistyles style objects) — deliberate `expo.install.exclude` silences expo-doctor
- `@shopify/flash-list` **exactly 2.0.2** (Expo SDK 57 bundled pin)
- Root `overrides` pin `react` and `react-dom` to the same exact version — `@clerk/react` peer-pulls a newer react-dom otherwise and React crashes on exact-version mismatch
- `@sentry/react-native` stays `~7.11.0` until getsentry/sentry-react-native#6384 closes

## Architecture rules

- **Vendor quarantine**: every third-party service lives behind `@repo/<vendor>` with `keys.ts` (zod schema), a provider/client entry, and inert-when-unset behavior (no key → no-op + at most ONE `console.info`; never throw, never warn-spam). App code never imports vendor SDKs directly (e.g. `useSignIn` comes from `@repo/auth`, not `@clerk/expo`).
- **Env**: `EXPO_PUBLIC_*` only in client code; validated once at boot via `@repo/env` `composeEnv` in `apps/mobile/src/env.ts`. Metro statically inlines `process.env.EXPO_PUBLIC_X` member expressions — always read env via static member access. Real secrets live only in Supabase secrets / EAS env, never client files. Never commit `.env.local`; never put real values in `.env.example`.
- **Auth**: Clerk Core 3 result-object API (`signIn.emailCode.sendCode/verifyCode`, `finalize()` — methods return `{ error }`, they don't throw). Supabase runs in third-party-auth mode: the Clerk JWT rides every request via the `accessToken` getter; RLS policies key on `auth.jwt()->>'sub'`. Route gating is declarative `Stack.Protected` in `apps/mobile/src/app/_layout.tsx` — every unauthenticated screen MUST be declared inside the `!isSignedIn` guard or users get stranded on it after sign-in (this bug shipped once; don't reintroduce it).
- **Styling**: Unistyles v3 tokens only (`packages/design-system/src/tokens.ts`) — no hardcoded hex in app code (theme has `danger`, `accent`, etc.). `index.ts` imports unistyles config BEFORE `expo-router/entry`; that load order is correctness, not style. UI is deliberately grayscale; accent tokens exist but stay unused in the demo.
- **Glass**: all glass uses system APIs (`expo-glass-effect` GlassView, `@expo/ui` SwiftUI `glassEffect`) gated behind `isLiquidGlassAvailable()` with fill/hairline fallbacks. Never fake glass with translucent washes.
- **Icons**: SF Symbols need Android counterparts — NativeTabs icons take `sf` + `md` (Material) props; never ship an Apple private-use glyph (U+F8FF) in a cross-platform string.

## Verification expectations

Every change: `tsc --noEmit` and `biome check` on touched surfaces, `vitest run` where the package has tests, and no new lint suppressions (the repo has zero — keep it that way; restructure instead). UI changes on iOS should be visually verified in the simulator; Android parity checks matter for safe-area (contentInsetAdjustmentBehavior is iOS-only) and icon sources.

## Do not touch without explicit instruction

`.env.local` (user secrets), `ISA.md` (project system of record — humans/primary agent maintain it), `tooling/pins.json` values, published npm metadata in root `package.json` (`name`, `bin`, `files`, `publishConfig`).
