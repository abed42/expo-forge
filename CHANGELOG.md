# Changelog

## 0.2.0 — 2026-07-23

Adds a Showcase tab: a working tour of the template's UI kit, built entirely
on system APIs so the scaffolded app demonstrates the patterns it ships with.

### Added

- **Showcase tab** — liquid-glass hero, native drawers (formSheet with
  detents plus a SwiftUI `BottomSheet`), a long-press context menu, menus /
  action sheets / alerts, and a filter row that reflows a list, grid, or map
  through a Reanimated layout transition. Every surface has an Android and a
  pre-iOS-26 fallback, so the tab degrades instead of crashing.
- **`showcase-sheet`** route — a native `formSheet` (detents `0.6 → 1.0`,
  visible grabber) carrying a real `UIToolbar` with a native menu. The bottom
  toolbar mounts after the present transition settles, working around blank
  toolbar items when configured mid-presentation (expo/expo#44493).
- **`expo-maps`** (`~57.0.1`) drives the Map segment. It is resolved through
  a lazy `require`, so dev clients built before this release still render the
  placeholder card rather than failing to load the route. **Existing dev
  clients need a rebuild to see the live map.**
- **Pin drift suite** (`scripts/pins.test.ts`) diffs every `tooling/pins.json`
  entry against the root and app manifests, and asserts `templateRef` tracks
  the published version — the two invariants `AGENTS.md` documents but
  nothing enforced.

### Fixed

- In-app appearance now calls `Appearance.setColorScheme`, so native views
  (SwiftUI hosts, glass, menus, sheets) follow a pinned Light/Dark choice
  instead of staying on the OS theme — previously a pinned theme could leave
  the segmented picker illegible.
- `apps/mobile` had drifted to `expo@^57.0.7` against a `~57.0.2` pin — a
  caret where the template uses tildes throughout. Restored to the pinned
  spec; `~57.0.2` already admits the resolved `57.0.7`, so nothing downgrades.

### Changed

- Tabs tint with the theme's ink instead of the system blue, matching the
  grayscale design.
- Profile's "Pro" entry point moved from a chip to a crown icon button beside
  sign-out, freeing the chip row for status.

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
