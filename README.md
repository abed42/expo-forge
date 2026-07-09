# ∧ / expo-forge

**Production-grade template for Expo apps.**

<div>
  <img src="https://img.shields.io/npm/v/create-expo-forge" alt="" />
  <img src="https://img.shields.io/npm/l/create-expo-forge" alt="" />
</div>

<!-- Downloads badge joins at launch:
  <img src="https://img.shields.io/npm/dy/create-expo-forge" alt="" />
-->

## Overview

expo-forge is a production-grade template for [Expo](https://expo.dev) apps. It's designed to be a comprehensive starting point for building mobile applications, providing a solid, opinionated foundation with minimal configuration required.

Modeled on [Hayden Bleasel](https://github.com/haydenbleasel)'s [next-forge](https://github.com/vercel/next-forge), expo-forge brings the same philosophy to native mobile: balance speed and quality to help you ship thoroughly-built products faster.

expo-forge is an independent community template and is not affiliated with Expo. Expo is a trademark of 650 Industries.

### Philosophy

expo-forge is built around five core principles:

- **Fast** — Quick to build, run, ship, and iterate on
- **Cheap** — Free to start with services that scale with you
- **Opinionated** — Integrated tooling designed to work together
- **Modern** — Latest stable features with healthy community support
- **Safe** — End-to-end type safety and robust security posture

## Status

expo-forge ships today: the template builds and runs (iOS + Android development clients), and `create-expo-forge@0.1` is published on npm. Scaffold with `bun create expo-forge`. (The bare `expo-forge` npm name belongs to an unrelated package — this project ships as `create-expo-forge`.)

## Features

expo-forge comes with batteries included:

### Apps

- **Mobile** — Expo app with onboarding/auth, masonry home feed, item detail (Apple zoom), search, and profile — built on expo-router native tabs (iOS 26 liquid glass) and a dev-client workflow (not Expo Go)

### Packages

- **Authentication** — Powered by [Clerk](https://clerk.com) via `@clerk/expo` — email code plus Apple/Google SSO
- **Backend** — [Supabase](https://supabase.com) client factory, an RLS example migration, and generated types
- **Design System** — Design tokens via [react-native-unistyles](https://www.unistyl.es) v3 (light/dark adaptive), Button/IconButton/Chip/SearchField/Skeleton, and a NavThemeProvider
- **System materials** — All glass surfaces (tab bar, header chrome, buttons) use real Liquid Glass APIs (SwiftUI `glassEffect`, `expo-glass-effect`), so they automatically respect the user's iOS 26 appearance setting (Clear/Tinted) and accessibility options like Reduce Transparency
- **Analytics** — Product analytics via [PostHog](https://posthog.com) (optional)
- **Observability** — Error tracking via [Sentry](https://sentry.io) (optional)
- **Payments** — In-app subscriptions via [RevenueCat](https://www.revenuecat.com) (optional)
- **Notifications** — Push notifications via expo-notifications
- **Updates** — Over-the-air updates via expo-updates
- **Environment** — `EXPO_PUBLIC_*` keys validated by [Zod](https://zod.dev) at boot with a composable `composeEnv` pattern
- **TypeScript Config** — Shared strict TypeScript configuration

Optional vendor packages no-op when their keys are unset — the app runs with just the required keys.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- Xcode (for iOS) or Android Studio (for Android)
- A [Clerk](https://clerk.com) application and a [Supabase](https://supabase.com) project (free tiers work)

### Installation

Scaffold a new app with the init wizard:

```sh
bun create expo-forge my-app
```

The wizard clones the template, renames the app and bundle identifier, prompts for your vendor keys with live validation (every key is skippable — add it later in `apps/mobile/.env.local`), lets you remove the optional vendors entirely (package, deps, and wiring stripped cleanly), and runs `bun install`.

To exercise the CLI against a local checkout (agents / contributors):

```sh
git clone https://github.com/abed42/expo-forge.git
cd expo-forge && bun install && bunx tsup
cd .. && node expo-forge/dist/index.js init my-app --template ./expo-forge --yes --skip-optional
```

#### CLI flags

Both `create-expo-forge [name]` and `create-expo-forge init [name]` accept:

| Flag | Description |
| --- | --- |
| `--name <name>` | App name in kebab-case (overrides the positional) |
| `--bundle-id <id>` | Reverse-DNS bundle identifier (default: `com.example.<name>`) |
| `--template <url-or-path>` | Template git URL or local path (default: this repo) |
| `--clerk-key <key>` | Clerk publishable key (`pk_...`) |
| `--supabase-url <url>` | Supabase project URL (`https://...`) |
| `--supabase-key <key>` | Supabase publishable key |
| `--skip-optional` | Skip optional vendors (PostHog, Sentry, RevenueCat) without prompting |
| `--remove <vendors>` | Comma-separated optional vendors to strip out: `posthog,sentry,revenuecat` |
| `--yes` | Non-interactive: use flags and defaults, leave unanswered keys blank |
| `--json` | Agent mode: non-interactive, no UI; print one machine-readable JSON result as the last line of stdout |

#### Set up with a coding agent

The wizard is agent-friendly. `--json` runs it fully non-interactively (missing keys are marked skipped, never prompted) and prints exactly one JSON object as the last line of stdout. One-shot:

```sh
bun create expo-forge my-app --bundle-id com.acme.myapp --skip-optional --json
```

On success the JSON is:

```
{ ok: true, appName, directory, bundleId,
  keys: { clerk, supabaseUrl, supabaseKey, posthog, sentry, revenuecat },  // "set" | "skipped" | "removed"
  installed,      // bun install succeeded
  pendingSteps }  // [{ id, title, kind: "browser"|"terminal"|"editor", agentRunnable, command?, url?, detail }]
```

`pendingSteps` is generated from the actual scaffold state — skipped Clerk/Supabase keys produce the exact CLI recovery steps (`clerk env pull`, `supabase link` + `api-keys`), and the standing steps (first `bun ios` build, `supabase db push`, `eas init`, Clerk↔Supabase dashboard wiring) are always present. Steps with `agentRunnable: false` are browser logins and dashboard actions — the only parts that need a human; an agent can run everything else and should relay those to its user. On failure the last line is `{ ok: false, error, failedStep }` and the process exits 1.

Every scaffold also receives a human-readable `NEXT_STEPS.md` (same steps as checkboxes, grouped "you (browser)" vs "agent/terminal") and a scaffold-appropriate `AGENTS.md` rewritten from this repo's maintainer guide.

### Setup

If you cloned manually instead of using the wizard:

1. Copy `.env.example` to `.env` and fill in the required keys: your Clerk publishable key (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`) and Supabase URL and publishable key (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`)
2. Optionally add PostHog, Sentry, or RevenueCat keys — each vendor stays inert until its key is set
3. Build and run the dev client:

```sh
cd apps/mobile && bun ios
```

Environment variables are validated by Zod at boot, so misconfiguration fails loudly rather than at runtime.

## Structure

expo-forge uses a monorepo structure managed by Turborepo with Bun workspaces:

```
expo-forge/
├── apps/
│   └── mobile/              # Expo app (welcome, auth, home, profile)
├── packages/
│   ├── auth/                # Clerk (@clerk/expo)
│   ├── backend/             # Supabase client, RLS migration, types
│   ├── design-system/       # Unistyles tokens + components
│   ├── analytics/           # PostHog (optional)
│   ├── observability/       # Sentry (optional)
│   ├── payments/            # RevenueCat (optional)
│   ├── notifications/       # expo-notifications
│   ├── updates/             # expo-updates
│   ├── env/                 # Zod composeEnv pattern
│   └── typescript-config/   # Shared strict tsconfig
└── tooling/
    └── pins.json            # Single source for native-coupled versions
```

#> **Tip:** both key sets can come from CLIs instead of dashboards — `clerk env pull` (after `clerk link`) writes the Clerk publishable key, and `supabase projects api-keys` prints the Supabase publishable key. If you use `clerk env pull`, delete the `CLERK_SECRET_KEY` line it adds — secrets don't belong in client env files.

## Version pinning

Native-coupled dependency versions live in `tooling/pins.json` as the single source of truth: Expo SDK 57, React Native 0.86, React 19.2, and friends. Two pins are deliberate and load-bearing:

- `react-native-worklets` is pinned **exactly** to `0.10.0` (Expo's own pin — 0.10.1 crashes at launch)
- `react-native-reanimated` is a deliberate override at `^4.5.1`

### Known gotchas

- **Hoisted linker required** — `bunfig.toml` forces Bun's hoisted linker because Metro cannot resolve modules through Bun's default isolated layout. Don't remove it.
- **iOS deployment target 17.0** — required by `@clerk/expo`, set via `expo-build-properties`.
- **Dev client, not Expo Go** — this template does not run in Expo Go, by design. Production dependencies ship native code that Go's sandbox doesn't include: react-native-unistyles v3 (Nitro Modules), @clerk/expo (ClerkKit / native Google Sign-In), @sentry/react-native, react-native-purchases — plus config Go can't honor (iOS 17 deployment target, config plugins). Run a development build instead: `bun ios` / `bun android` compiles the dev client once, and everything after is the familiar Metro hot-reload workflow.

## Scripts

Run from the repository root:

```sh
bun dev         # turbo dev
bun typecheck   # turbo typecheck
bun lint        # turbo lint
bun run fix     # biome check --write .
```

Linting and formatting are handled by [Biome](https://biomejs.dev) 2.

### CI

Every push to `main` and every pull request runs `.github/workflows/ci.yml`: Bun (version pinned by the `packageManager` field) installs with a frozen lockfile, then `bunx turbo lint typecheck test` fans out across all workspaces — Biome lint, `tsc --noEmit`, and Vitest suites — with the Turborepo cache persisted between runs.

Two [EAS Workflows](https://docs.expo.dev/eas/workflows/) live in `.eas/workflows/`:

- `create-production-builds.yml` — manual trigger (`eas workflow:run create-production-builds.yml`), builds iOS + Android with the `production` profile
- `publish-preview-update.yml` — on push to `main`, publishes an OTA update to the `preview` branch

They are syntax-complete but dormant until the project is linked to EAS. One-time activation: run `eas init` (keep the committed root `eas.json` profiles — or merge if `eas init` writes a new one), connect the GitHub repo to the EAS project on [expo.dev](https://expo.dev) so push triggers fire, and add an `EXPO_TOKEN` [access token](https://expo.dev/settings/access-tokens) as a repo secret for any CI-driven `eas` CLI calls. The `.eas/` workflows directory must sit next to `eas.json` at the repo root.

## Roadmap

- Package sign-in/sign-up screens inside `@repo/auth` (app routes become thin wrappers)
- Convex backend variant
- Android polish parity (safe-area, glass fallbacks already ship; deeper Material refinement)
- Hermes V1 + reanimated Android memory workaround docs

## Contributing

We welcome contributions! See the [contributing guide](.github/CONTRIBUTING.md) for details.

## License

[MIT](license.md)

Expo is a trademark of 650 Industries. expo-forge is an independent community project.
