---
task: Build expo-forge — production-grade Expo template (next-forge philosophy, native-first)
project: expo-forge
effort: E3
phase: build
progress: 0/46
mode: standard
started: 2026-07-07T14:00:00Z
updated: 2026-07-07T14:00:00Z
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
- [ ] ISC-1: repo at ~/Lab/expo-forge with git history; initial commit after scaffold
- [ ] ISC-2: root package.json — bun workspaces apps/* packages/*, packageManager bun
- [ ] ISC-3: turbo.json defines build/dev/lint/typecheck/test with ^-topology
- [ ] ISC-4: biome.jsonc at root; `bunx biome check .` exits 0
- [ ] ISC-5: packages/typescript-config exports base + expo-app + library presets
- [ ] ISC-6: root tsconfig strict; `bunx tsc --noEmit` exits 0 in apps/mobile
- [ ] ISC-7: `bun install` completes without errors at root
- [ ] ISC-8: apps/mobile package.json uses amber-proven pins (worklets 0.10.0 exact, reanimated ^4.5.1)
- [ ] ISC-9: index.ts imports design-system/unistyles BEFORE expo-router/entry
- [ ] ISC-10: app.json — typedRoutes + tsconfigPaths experiments on, scheme set, userInterfaceStyle automatic
- [ ] ISC-11: src/app/_layout.tsx wraps NavThemeProvider bridge + SystemUI root background
- [ ] ISC-12: (tabs)/_layout.tsx uses expo-router native tabs with 3 tabs (home, search, profile)
- [ ] ISC-13: tsconfig paths @/* and @repo/* resolve (typecheck proves)
- [ ] ISC-14: .env.example present listing all EXPO_PUBLIC_* keys with comments
- [ ] ISC-15: .gitignore covers node_modules, .expo, ios/android (CNG), .env*.local
- [ ] ISC-16: README stub states thesis + quickstart

### Design system (Cosmos language)
- [ ] ISC-17: packages/design-system exports Unistyles config — light+dark themes, adaptiveThemes on
- [ ] ISC-18: tokens: monochrome palette (near-black ink, white surface, warm grays), pill radius scale, gap() 8pt spacing, editorial type scale
- [ ] ISC-19: typed themes via UnistylesThemes module augmentation (typecheck proves)
- [ ] ISC-20: pill Button (dark ink / white label) + circular IconButton components
- [ ] ISC-21: Chip card (icon + label + count) + SearchField (full-radius) components
- [ ] ISC-22: Anti: no custom display font shipped — system fonts only, documented custom-font slot

### Vendor packages (each: keys schema + provider/client + inert-when-unset)
- [ ] ISC-23: packages/backend — supabase client factory, typed env, migrations dir, generated-types script
- [ ] ISC-24: packages/auth — Clerk Expo provider + secure-store token cache + keys schema
- [ ] ISC-25: packages/analytics — PostHog RN provider, no-ops without key
- [ ] ISC-26: packages/observability — Sentry RN init, no-ops without DSN
- [ ] ISC-27: packages/payments — RevenueCat wrapper, no-ops without key
- [ ] ISC-28: packages/notifications — expo-notifications registration helper
- [ ] ISC-29: packages/updates — expo-updates strategy + version display helper
- [ ] ISC-30: every package has keys.ts (Zod schema) consumed by app env composition

### CLI (create-expo-forge)
- [ ] ISC-31: npm name create-expo-forge published (placeholder ok early to claim)
- [ ] ISC-32: init wizard prompts generated from package keys.ts schemas with live validation
- [ ] ISC-33: optional services: skip (blank env) or remove (package + dep + env entry stripped)
- [ ] ISC-34: --skip-env and non-interactive flags work

### Demo app (Cosmos-shaped collections app)
- [ ] ISC-35: onboarding/auth flow — centered editorial title, pill Start, Stack.Protected gating
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
- [ ] ISC-44: Anti: no amber fonts/colors copied (grep design-system for amber palette = no match)
- [ ] ISC-45: Anti: no Stripe SDK anywhere in the template
- [ ] ISC-46: Anti: ~/Lab/amber and ~/Lab/next-forge remain unmodified

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
