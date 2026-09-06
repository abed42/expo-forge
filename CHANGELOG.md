# Changelog

## 0.3.0-beta.1 — 2026-09-06

Closed-beta release, published to npm under the `beta` dist-tag
(`bun create expo-forge@beta`). This is the first publish since 0.1.0:
0.1.1 and 0.2.0 were tagged but never reached npm, so beta testers get
everything from those releases plus the changes below.

### Added

- **Assistant chat** — a full-screen chat route (`src/app/chat.tsx` +
  `src/components/chat/`): streamed mock replies with an interruptible
  response, a keyboard-aware composer, and an attachment panel that grows out
  of the + button into a menu, photo grid, or live camera, with picked photos
  flying into the composer. Entry points: a Chat tab trigger that pushes the
  route over the tabs, the Home header, and the Showcase "Assistant" tile.
  The model is a mock (`use-mock-chat.ts`) — swap in a real endpoint there.
  The feature is self-contained; its README carries a removal recipe and every
  touch point outside the folder is marked `chat:`.
- **Honest Home feed states** — the feed distinguishes loading, ready, empty,
  and error instead of showing the same grey cards for all of them. Loading
  shows a shimmer (held at least 500 ms so the handoff is visible on keyless
  boots); empty and error render dot-patterned placeholder cards with real
  copy, plus a "Template loaded" banner whose one sentence names exactly what
  to configure (Supabase env unset, migration 0003 missing, request failed, or
  no rows). `useFeed` now returns a typed `fallback` reason.
- **Design system** — `Shimmer` (opacity pulse for in-flight placeholders,
  built on the core Animated API) and `DotPattern` (measured polka-dot texture
  with no loading semantics, theme-aware, no image assets).
- **Lazy native-module loaders** — `@repo/notifications` and `@repo/updates`
  resolve `expo-notifications` / `expo-updates` at call time inside a
  try/catch and degrade to `"unavailable"` when the native module is absent,
  so dev clients built without them no longer crash at import. A regression
  test covers the missing-module path.
- **Removal-anchor drift test** — `scripts/vendors.test.ts` asserts every
  vendor-removal anchor matches the template exactly once, turning a
  scaffold-time warning into a CI failure.

### Changed

- **Showcase** — the Filters section (chips + list/grid/map segments) is gone;
  the Apple Maps demo has its own Map tile. The tab icon is now a bento grid
  (`rectangle.3.group`) instead of sparkles.
- **Onboarding artwork** — the five-card collage deck is replaced by four
  aspect-matched posters.
- **iOS builds from source** — `ios.usePrecompiledModules: false` in the
  build-properties plugin. Expo's precompiled XCFrameworks for
  `expo-camera` / `expo-media-library` 57.0.4 were linked against a newer
  `expo-modules-core` than the pinned 57.0.6 and aborted at launch with a
  dyld "Symbol not found" crash. Source builds are slower; `AGENTS.md`
  documents the rationale and a known flaky `ExpoModulesMacros` step.
- New app dependencies for chat: `expo-blur`, `expo-camera`, `expo-haptics`,
  `expo-image` (pinned exactly to 57.0.1 — later patches don't compile
  against the pinned core), `expo-media-library`,
  `react-native-keyboard-controller`. `app.json` adds their plugins,
  permission strings, and Android `CAMERA`.
- Vendor-removal anchor for the paywall entry follows the Profile screen's
  `IconButton` markup (was the old `Chip`).

### Known beta limitations

- Chat is iOS-first: SF Symbol glyphs render nothing on Android and glass
  falls back to a flat fill. Material fallbacks are on the list.
- The chat model is a mock; nothing calls a real LLM.
- The `latest` npm tag stays on 0.1.0 until the beta closes.

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
