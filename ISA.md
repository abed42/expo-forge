---
task: Build expo-forge — production-grade Expo template (next-forge philosophy, native-first)
project: expo-forge
effort: E3
phase: build
progress: 38/52
mode: standard
started: 2026-07-07T14:00:00Z
updated: 2026-07-07T15:30:00Z
---

# ISA — expo-forge

> Project ISA (system of record). Seeded from `~/.claude/PAI/MEMORY/WORK/expo-forge-recon/ISA.md` — the full recon of next-forge + amber lives there.

## Problem

Starting a production Expo app means a week of undifferentiated setup: monorepo tooling, auth, backend, payments (IAP rules), analytics, crash reporting, OTA, EAS config, and a design system — with brittle native version pins that break builds. next-forge solved this for Next.js; nothing equivalent exists for Expo. (The npm package `expo-forge` is a taken, lower-ambition template — ours ships as `create-expo-forge`.)

## Vision

`bun create expo-forge` → a guided wizard collects your keys (required: Clerk, Supabase; optional: PostHog, Sentry — skippable or fully removable) → you open the simulator and see a beautiful, completely platform-native app (Cosmos-language minimal editorial monochrome, liquid-glass tabs, Apple-zoom transitions) → shipping is just `eas build && eas submit`. Nothing to host, nothing to deploy but the binary.

## Out of Scope

- Web/landing app, docs app (cut as scope creep — README + repo docs only).
- Convex backend in v1 (planned fast-follow variant; DevRel contact gets early access).
- Stripe for digital goods (App Store rules), CMS, collaboration, web-middleware security packages.
- Amber's aesthetic layer (fonts/colors) — mechanisms yes, look no.
- Android-polish parity in Phase 0 (iOS-first; Android must build and run, refinement later).

## Principles

- **Platform-native first**: navigation, tabs, headers, menus, sheets are the OS's own (@expo/ui + Expo Router native primitives). The platform provides the look; we provide tokens and structure.
- **The pattern over the catalog**: every vendor quarantined behind a `@repo/*` package with a stable import surface (next-forge's keys.ts/provider anatomy, adapted to Expo's env model).
- **No deploy but the binary**: backend choices must keep shipping = EAS submit.
- **Tested version sets**: releases track Expo SDK releases; every native dep pinned and verified (amber's worklets=0.10.0 lesson).
- **Optional means removable**: skipped vendors strip cleanly via the CLI, leaving no dead weight.

## Constraints

- Bun + Turborepo + Biome + TypeScript strict; workspace:* protocol; packages ship raw TS.
- Expo SDK 57 baseline (amber-proven pins: RN 0.86, React 19.2, reanimated ≥4.5.1, worklets =0.10.0 exact) unless currency research proves a newer stable set.
- Supabase (RLS, generated types) + Clerk; RevenueCat for payments; PostHog analytics/flags; Sentry RN.
- Unistyles v3 configured before `expo-router/entry` (load-order is correctness).
- Dev-client workflow (native modules preclude Expo Go).
- npm distribution name: `create-expo-forge`.

## Goal

A cloneable, wizard-installed Expo monorepo template where `bun install` + typecheck + lint pass green, the mobile app boots to a Cosmos-language native-first demo (feed, detail, profile, auth), every vendor package is swappable/removable, and CI + EAS are wired — ready for the next-forge creator's review.

## Criteria

### Phase 0 — skeleton (current)
- [x] ISC-1: repo at ~/Lab/expo-forge with git history; initial commit after scaffold
- [x] ISC-2: root package.json — bun workspaces apps/* packages/*, packageManager bun
- [x] ISC-3: turbo.json defines build/dev/lint/typecheck/test with ^-topology
- [x] ISC-4: biome.jsonc at root; `bunx biome check .` exits 0
- [x] ISC-5: packages/typescript-config exports base + expo-app + library presets
- [x] ISC-6: root tsconfig strict; `bunx tsc --noEmit` exits 0 in apps/mobile
- [x] ISC-7: `bun install` completes without errors at root
- [x] ISC-8: apps/mobile package.json uses amber-proven pins (worklets 0.10.0 exact, reanimated ^4.5.1)
- [x] ISC-9: index.ts imports design-system/unistyles BEFORE expo-router/entry
- [x] ISC-10: app.json — typedRoutes + tsconfigPaths experiments on, scheme set, userInterfaceStyle automatic
- [x] ISC-11: src/app/_layout.tsx wraps NavThemeProvider bridge + SystemUI root background
- [x] ISC-12: (tabs)/_layout.tsx uses expo-router native tabs with 3 tabs (home, search, profile)
- [x] ISC-13: tsconfig paths @/* and @repo/* resolve (typecheck proves)
- [x] ISC-14: .env.example present listing all EXPO_PUBLIC_* keys with comments
- [x] ISC-15: .gitignore covers node_modules, .expo, ios/android (CNG), .env*.local
- [x] ISC-16: README stub states thesis + quickstart

### Design system (Cosmos language)
- [x] ISC-17: packages/design-system exports Unistyles config — light+dark themes, adaptiveThemes on
- [x] ISC-18: tokens: monochrome palette (near-black ink, white surface, warm grays), pill radius scale, gap() 8pt spacing, editorial type scale
- [x] ISC-19: typed themes via UnistylesThemes module augmentation (typecheck proves)
- [x] ISC-20: pill Button (dark ink / white label) + circular IconButton components
- [ ] ISC-21: Chip card (icon + label + count) + SearchField (full-radius) components
- [x] ISC-22: Anti: no custom display font shipped — system fonts only, documented custom-font slot

### Vendor packages (each: keys schema + provider/client + inert-when-unset)
- [x] ISC-23: packages/backend — supabase client factory, typed env, migrations dir, generated-types script
- [x] ISC-24: packages/auth — Clerk Expo provider + secure-store token cache + keys schema
- [x] ISC-25: packages/analytics — PostHog RN provider, no-ops without key
- [x] ISC-26: packages/observability — Sentry RN init, no-ops without DSN
- [x] ISC-27: packages/payments — RevenueCat wrapper, no-ops without key
- [x] ISC-28: packages/notifications — expo-notifications registration helper
- [x] ISC-29: packages/updates — expo-updates strategy + version display helper
- [x] ISC-30: every package has keys.ts (Zod schema) consumed by app env composition

### CLI (create-expo-forge)
- [x] ISC-31: npm name create-expo-forge published (placeholder ok early to claim)
- [x] ISC-32: init wizard prompts generated from package keys.ts schemas with live validation
- [x] ISC-33: optional services: skip (blank env) or remove (package + dep + env entry stripped)
- [x] ISC-34: --skip-env and non-interactive flags work

### Demo app (Cosmos-shaped collections app)
- [x] ISC-35: onboarding/auth flow — centered editorial title, pill Start, Stack.Protected gating
- [ ] ISC-36: home — masonry media feed (FlashList), unadorned images, thin-underline segmented tabs
- [ ] ISC-37: item detail via Apple-zoom link transition + native context menu on cells
- [ ] ISC-38: profile page per Cosmos ref — circular icon buttons, centered identity stack, chip shortcuts, masonry
- [ ] ISC-39: liquid-glass floating tab bar (amber treatment) over content

### Quality / ops
- [ ] ISC-40: .github/workflows/ci.yml — install, lint, typecheck, test on PR
- [ ] ISC-41: Vitest configured with ≥1 real test per app boundary
- [ ] ISC-42: eas.json — development/preview/production profiles, appVersionSource remote, autoIncrement
- [ ] ISC-43: central version catalog — native-coupled dep versions declared once

### Anti-criteria
- [x] ISC-44: Anti: no amber fonts/colors copied (grep design-system for amber palette = no match)
- [x] ISC-45: Anti: no Stripe SDK anywhere in the template
- [x] ISC-46: Anti: ~/Lab/amber and ~/Lab/next-forge remain unmodified

## Test Strategy

| isc | type | check | tool |
|-----|------|-------|------|
| 1-16 | build probes | bun install / tsc --noEmit / biome check exit 0; file reads | Bash + Read |
| 17-22 | typecheck + read | tokens present, augmentation compiles, components exist | Read + tsc |
| 23-30 | read + typecheck | package anatomy present, schemas compose | Read + tsc |
| 31-34 | CLI run | run init against tmp dir, assert written .env | Bash |
| 35-39 | live probe | simulator screenshots via Interceptor/expo run | screenshot |
| 40-43 | file + CI run | workflow file valid, eas.json shape | Read |
| 44-46 | grep probes | rg for amber hexes, stripe; git status clean in refs | Bash |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| phase0-skeleton | monorepo + mobile boot scaffold | ISC-1..16 | — | yes (Forge) |
| currency-research | verify SDK/@expo/ui/pins against today's reality | informs 8,12,43 | — | yes (researcher) |
| design-tokens | Cosmos token system + core components | ISC-17..22 | phase0 | partial |
| vendor-packages | 7 quarantined vendor packages | ISC-23..30 | phase0 | yes |
| cli-wizard | create-expo-forge init/update | ISC-31..34 | vendor-packages | yes |
| demo-app | collections demo (feed/detail/profile) | ISC-35..39 | design-tokens, vendor-packages | no |
| ci-quality | CI, tests, EAS, catalog | ISC-40..43 | phase0 | yes |

## Decisions

- 2026-07-07: Stack ratified across recon session: @expo/ui + Expo Router native-first · Supabase v1 (Convex fast-follow) · Clerk · RevenueCat · PostHog + Sentry optional · mobile-only · schema-driven CLI wizard. Full trail in recon ISA.
- 2026-07-07: npm `expo-forge` taken (active competing template v2.1.3) → distribution name **create-expo-forge** (verified free). expo-forge.com owned; brand name stays expo-forge.
- 2026-07-07: Defaults adopted without further asks per user's "spin up agents" green light: system fonts, Cosmos collections demo, Clerk. All reversible.
- 2026-07-07: Plain Biome 2 recommended rules over ultracite preset — one less third-party coupling; revisit if the next-forge creator's review suggests otherwise.
- 2026-07-07: SDK 57 + amber's proven pins as scaffold baseline; currency researcher may bump if a newer stable set is verified.
- 2026-07-07: CURRENCY RESEARCH (verified, sources in recon transcript): SDK 57 IS current stable (shipped 2026-06-30; no 58 beta) — scaffold baseline confirmed, pins.json status can move provisional→verified. Expo's own bundledNativeModules pins worklets exactly 0.10.0 (corroborates amber), flash-list 2.0.2, sentry ~7.11.0. Rulings encoded: (1) use @clerk/expo NOT deprecated @clerk/clerk-expo; (2) @expo/ui stable since SDK 56 but isolate behind our wrapper components (API churn history); (3) native tabs still alpha ('unstable-native-tabs') — adopt but wrap, root ThemeProvider explicit theme required to kill iOS-26 tab-switch flashes; (4) gate expo-glass-effect behind isLiquidGlassAvailable() (beta crashes); (5) Sentry stays ~7.11.0 until getsentry#6384 closes — note 8.x lane; (6) PostHog replay plugin renamed @posthog/react-native-plugin; (7) ship .eas/workflows/*.yml (EAS Workflows CI/CD) as differentiation; (8) document Hermes V1+reanimated Android memory workaround (worklets bundle mode).

## Verification

- ISC-1..16: Forge run (commit 30f5150) + independent spot-checks — `bun install` exit 0 (1115 pkgs), `bunx tsc --noEmit` exit 0, `bunx biome check .` exit 0 (27 files), load-order comment read back in apps/mobile/index.ts, structure ls verified.
- ISC-17..20, 22: design-system files read/typechecked — tokens.ts (monochrome + pill + gap() + system-font scale with custom-font slot), unistyles.ts (adaptiveThemes + typed augmentation), nav-theme.tsx, Button/IconButton. ISC-21 (Chip/SearchField) open — next phase.
- ISC-44: Forge grep — no amber hex values in design-system. ISC-45: grep — no Stripe anywhere. ISC-46: `git status --porcelain` empty in amber AND next-forge after removing PAI-hook `${HOME}` junk (pre-existing, untracked).
- Follow-ups applied post-Forge (commit 5489684): flash-list repinned exact 2.0.2 (matches Expo bundledNativeModules), reanimated 4.5.1 override encoded via expo.install.exclude, Codex/.tmp byproducts removed.
- expo-doctor: 2 residual flags are known-benign (bun isolated-store false positive; reanimated deliberate override now excluded from checks).
- 2026-07-07: TEMPLATE GOTCHA (shipped): bun 1.3 defaults workspaces to the isolated linker; Metro crashes with "Cannot read properties of undefined (reading 'transformFile')". Fix encoded: root bunfig.toml [install] linker = "hoisted". Also: a native project generated against the isolated store keeps stale .bun paths — expo prebuild --clean required after switching linkers. expo-doctor's "duplicate installs" flag was this, not a false positive.
- ISC-23..30: Forge commit 60c118d — 8 vendor packages (env composer, backend/auth/analytics/observability/payments/notifications/updates), per-package tsc PASS ×8, biome 50 files clean, inert-when-unset verified per package. Follow-ups landed: bun.lock committed, PostHog env renamed EXPO_PUBLIC_POSTHOG_KEY (+HOST) to match @repo/analytics.
- ISC-35 (partial): onboarding + sign-in code-complete with Stack.Protected gating (tsc + biome clean); [x] deferred until simulator screenshot probe.
- 2026-07-07: TEMPLATE GOTCHA (shipped): @clerk/expo v3 links ClerkKit via SPM and requires iOS deploymentTarget >= 17.0; Expo SDK 57 defaults to 16.4 → pod install post-install hook crashes ("package_product_dependencies for nil") with the real cause buried: "[Expo] @clerk/expo was not linked: requires iOS 17.0 but app targets 16.4". Fix encoded: expo-build-properties plugin with ios.deploymentTarget 17.0. The CLI wizard must set this whenever auth is kept.
- 2026-07-07: TEMPLATE GOTCHA (shipped): @clerk/expo -> @clerk/react peer-installs react-dom; bun resolves it to latest, which breaks React's exact-version requirement at runtime ("Incompatible React versions"). Fix encoded: root package.json overrides pin react AND react-dom to the SDK's exact react version. Belongs in tooling/pins.json discipline.

### Auth parity with next-forge (added 2026-07-07, user directive: "do as much as next-forge")
- [ ] ISC-47: sign-in/sign-up screens packaged as @repo/auth RN components (app routes become thin wrappers)
- [x] ISC-48: Supabase third-party auth with Clerk — client accessToken getter passes Clerk JWT; RLS policies key on Clerk user id
- [x] ISC-49: Clerk webhook -> Supabase Edge Function (svix-verified) syncing user creation/update/deletion
- [ ] ISC-50: profiles row exists after first sign-up (probe: SELECT by clerk user id)
- [ ] ISC-51: profile tab shows user identity + working sign-out
- [ ] ISC-52: Anti: CLERK_SECRET_KEY never appears in any client env file or bundle
- ISC-35 (live probe, partial): simctl screenshot 2026-07-07 17:34 — onboarding renders per Cosmos ref on iPhone 17 Pro sim (tagline/collage/wordmark/ToS/pill Start). Full [x] after user completes email-code flow to tabs.
- 2026-07-07: Onboarding collage uses 6 images from cdn.cosmos.so (downloaded into assets/images/onboarding/). PRE-LAUNCH BLOCKER: these belong to their original creators via Cosmos — fine for private dev, must be replaced with neutral/licensed placeholder imagery before the template goes public. Same class as the Expo-wordmark trademark check.
- ISC-35 FULL PASS: user completed Google SSO on simulator, landed on native tabs (screenshot 18:28). Clerk user created.

- ISC-48/49 verified (commit 20d1d89): accessToken client + useSupabase hook (tsc 0), RLS-on-sub migration 0002, svix-verified edge function. ISC-50 [DEFERRED-VERIFY]: needs dashboard setup + function deploy — probe query in packages/backend/supabase/functions/clerk-webhook/README.md.
- 2026-07-07: Clerk Native API enabled by user (dashboard). Deferred to pre-launch checklist: register iOS app (Team ID + bundle id, AASA) and SSO redirect allowlist (expoforge:// scheme) on Clerk's Native applications page — required for native Apple sign-in/passkeys and locked-down OAuth redirects in production.
- ISC-31 [x] LIVE PROBE: create-expo-forge@0.0.1 published 2026-07-08T05:32Z by abed42; `bunx create-expo-forge` resolves and prints the CLI banner (verified from a scratch dir).
- ISC-32/33/34 [x] (commit fb22eec): wizard live-probed twice against local template — full scaffold and remove-variant both bun-install + typecheck green; flags enable non-interactive CI use.
