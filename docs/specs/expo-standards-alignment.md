# Expo Standards Alignment Plan

## 1. Metadata

- Status: DRAFT
- Scope: Align expo-forge with Expo's app-root, EAS, development-build, and native dependency conventions while retaining Bun workspaces, Turborepo, and vendor quarantine.
- Working Directory: `/Users/abed42/Lab/expo-forge`
- Depends On: none
- Effort Level: Extended+

### Scope statement

**In scope:** Expo/EAS file placement, `expo-dev-client`, app-visible native dependencies, canonical commands, scaffold transforms, documentation, and verification.

**Out of scope:** flattening `packages/*`, removing Turborepo, changing vendor choices, redesigning application screens, provisioning EAS credentials, or changing load-bearing native pins without Expo compatibility evidence.

**Assumptions:** expo-forge remains an agent-first, production-grade template rather than a minimal beginner starter; `apps/mobile` remains the sole Expo application; vendor quarantine remains a product invariant.

**Acceptance:** a fresh scaffold follows Expo's documented monorepo layout, exposes native dependencies to Expo tooling, builds a development client, and passes the repository gate.

**Execution precondition:** finish, verify, and commit the current paywall/payments work before Track C begins. Track C edits the same payment manifests and lockfile; running it over an uncommitted paywall diff creates avoidable ownership and merge ambiguity.

## 2. Context

### 2a. Business context

expo-forge promises a production-grade Expo starting point that agents can extend safely. The monorepo and vendor packages improve agent legibility, but repository-root versus Expo-app-root ambiguity creates avoidable setup failures and undermines confidence in the template.

### 2b. Technical state

- Bun workspaces and Turborepo coordinate one Expo app plus ten focused packages.
- `apps/mobile/app.json` and `apps/mobile/package.json` correctly establish the Expo project root.
- Local environment files now correctly live under `apps/mobile/`.
- Root `eas.json` and root `.eas/workflows/` do not follow Expo's documented monorepo placement.
- `apps/mobile` declares a development-build workflow but does not declare `expo-dev-client`.
- Native SDKs are generally owned by wrapper packages such as `@repo/payments`, which Expo autolinking can resolve recursively, but app-centric tools cannot govern those versions as clearly.
- `scripts/steps.ts` currently tells users to move EAS configuration to the repository root, which is contrary to Expo's monorepo guidance.
- Root package scripts run repository tasks; app package scripts run Expo tasks.

### 2c. Discoveries

- Expo officially supports Bun workspace monorepos and automatically configures Metro.
- Expo documents `apps/mobile` as the correct location for `eas.json`, credentials, and app-specific EAS commands.
- Expo recommends `expo-dev-client`; native code additions still require a rebuilt binary.
- Dropping Turbo would not change Metro, CocoaPods, environment loading, autolinking, or native binary composition.
- Expo autolinking resolves transitive dependencies recursively, so wrapper-owned SDKs are linkable; the remaining concern is version visibility to `expo install --check` and `expo-doctor`.

Official references:

- [Work with monorepos](https://docs.expo.dev/guides/monorepos/)
- [Set up EAS Build with a monorepo](https://docs.expo.dev/build-reference/build-with-monorepos/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo autolinking](https://docs.expo.dev/modules/autolinking/)
- [Environment variables](https://docs.expo.dev/guides/environment-variables/)

## 3. Design decisions

### First-principles decomposition

The template needs two distinct roots:

1. The **repository root** owns workspaces, Turbo, the published CLI, and cross-package quality gates.
2. The **Expo app root** owns Expo CLI, Metro, native generation, EAS, app environment files, and native runtime dependencies.

Most current failures came from crossing those ownership boundaries, not from having two roots.

| Decision | Alternatives considered | Rationale | Constraint type |
| --- | --- | --- | --- |
| Keep Bun workspaces and Turborepo | Keep both; keep workspaces but drop Turbo; flatten into one Expo app | Eleven package/app targets benefit from parallel checks and caching; dropping Turbo fixes no runtime issue | SOFT |
| Treat `apps/mobile` as the only Expo/EAS root | App root; repository root; path overrides from repository root | Matches official Expo monorepo guidance and removes command ambiguity | HARD |
| Install `expo-dev-client` in the app | Install it; use debug builds without it; rely on Expo Go | Native SDKs exclude Expo Go and the template explicitly promises development builds | HARD |
| Make native SDKs app-visible while preserving wrappers | App dependency + wrapper peer dependency; wrapper dependency only; app imports SDK directly | Expo tools inspect the app manifest, while wrappers retain stable imports and vendor quarantine | SOFT |
| Keep canonical Expo commands in the app package | App scripts only; root aliases only; duplicate canonical and alias commands | Users and agents can follow Expo documentation directly from `apps/mobile` | HARD |
| Permit optional root convenience aliases | No aliases; aliases marked as shorthand; aliases presented as canonical | Aliases improve agent ergonomics only when documentation clearly labels ownership | SOFT |

## 4. Failure modes

| Trigger | Observable consequence | Mitigation |
| --- | --- | --- |
| `eas.json` remains at repository root | `eas build` from `apps/mobile` cannot find profiles | Move EAS files into `apps/mobile` and update all instructions |
| `expo-dev-client` remains absent | Development-build behavior differs from documented template behavior | Install it with `bun expo install expo-dev-client` from the app root |
| Native SDK exists only in a wrapper manifest | Expo version checks may not report app-native drift clearly | Declare native SDK in app dependencies and wrapper peer/dev dependencies |
| App and wrapper declare incompatible native versions | Autolinking may select duplicates or a surprising version | Source versions from pins and verify one resolved copy with Expo Doctor |
| Vendor removal deletes wrapper but leaves app SDK | Scaffold retains unused native code and larger binaries | Extend vendor removal edits to remove app-native dependencies |
| Native dependency is added without rebuilding | JavaScript loads while the native module is absent | Document and test the install → prebuild/build boundary |
| Root alias is described as an Expo command | Users run commands in the wrong directory and misplace files | Label root aliases as monorepo conveniences only |
| EAS workflow files move without updating references | README and generated next steps point to stale paths | Search all EAS path references and test scaffold output |
| Fresh scaffold is tested from uncommitted template state | Local clone test omits changes because it clones committed HEAD | Commit before end-to-end local-template scaffold verification |

## 5. Test plan

### Unit tests

| Test file | What it tests | Key assertions |
| --- | --- | --- |
| `scripts/vendors.test.ts` or existing CLI vendor suite | Optional native vendor removal | Wrapper and app-native dependency both disappear |
| `scripts/initialize.test.ts` or existing CLI suite | Generated instructions and file placement | Generated README points only to `apps/mobile`; EAS step uses app root |
| `packages/payments/src/client.test.ts` | Missing native module behavior | Configuration remains inert and never crashes |

### Integration tests

| Test | What it tests | Setup required |
| --- | --- | --- |
| Local scaffold smoke | CLI output, install, typecheck, and file layout | Built CLI and committed template HEAD |
| Expo Doctor | Native version and duplicate-module health | Dependencies installed from repository root |
| iOS development build | Native module inclusion | Xcode, simulator, valid local public keys |
| EAS config inspection | EAS profile discovery from app root | EAS CLI; authentication not required for local config validation where supported |

### Manual verification

| Step | Expected result |
| --- | --- |
| Run `bun expo start` from `apps/mobile` | Output targets a development build, not Expo Go |
| Run `bun ios` after adding RevenueCat | Installed binary contains `RNPurchases` |
| Open Profile → Pro | Offering loads or reports only dashboard configuration absence |
| Run `eas build:configure` from `apps/mobile` | Existing app-local `eas.json` is discovered |
| Remove RevenueCat in a scaffold | Payment package, app dependency, env entry, and UI wiring are absent |

**Mock boundaries:** package tests mock vendor SDKs and native modules; Expo Doctor, scaffold smoke, iOS build, and EAS config checks use real tooling. Store transactions and production EAS builds remain manual/external.

## 6. Quality targets

| Metric | Target | Measurement |
| --- | ---: | --- |
| Type errors | 0 | `bunx turbo typecheck` |
| Biome errors | 0 | `bunx turbo lint` |
| Failing tests | 0 | `bunx turbo test` |
| Expo Doctor actionable failures | 0 | `cd apps/mobile && bunx expo-doctor` |
| Duplicate native module instances | 0 | Expo Doctor and lockfile inspection |
| EAS configuration roots | 1 | `rg --files -g 'eas.json'` |
| Real local env roots | 1 | `rg --files -g '.env.local'` excluding ignored user state |
| Scaffold path references to root EAS config | 0 | targeted `rg` verification |
| Native-module boot crashes when optional SDK unavailable | 0 | package tests and simulator smoke |
| Full cold quality gate duration (advisory) | record against 60-second baseline | time `bunx turbo lint typecheck test --force`; report regressions without blocking shipment |

## 7. Implementation structure

### Dependency graph

```text
Track A: Expo/EAS root alignment ───────┐
                                        ├──► Track D: Scaffold/docs alignment ──► Track E: Verification
Track B: Development-client setup ──────┤
                                        │
Track C: Native dependency ownership ───┘
```

### Track table

| Track | Description | Depends on | Parallelizable with |
| --- | --- | --- | --- |
| A | Move EAS files and correct command ownership | None | B, C |
| B | Add and document `expo-dev-client` | None | A, C |
| C | Make native SDK versions app-visible | None | A, B |
| D | Update CLI transforms and documentation | A, B, C | — |
| E | Run package, scaffold, Expo, and native verification | D | — |

## 8. Tracks

### Track A: Expo and EAS root alignment

**File manifest:**

| Action | Path | Description |
| --- | --- | --- |
| MOVE | `eas.json` → `apps/mobile/eas.json` | Place EAS profiles in Expo app root |
| MOVE | `.eas/workflows/*` → `apps/mobile/.eas/workflows/*` | Place workflows beside app EAS configuration |
| EDIT | `scripts/steps.ts` | Run `eas init` from `apps/mobile`; remove root-move advice |
| EDIT | `README.md` | Document app-root EAS commands and paths |
| EDIT | `AGENTS.md` | Separate repository and Expo/EAS command ownership |
| EDIT | `scripts/scaffold-agents.ts` | Keep exact transformation anchors synchronized |

**Implementation details:**

- Delete root EAS files only after app-local copies exist.
- Use `cd apps/mobile && eas ...` in generated agent-runnable instructions.
- Configure the Expo GitHub App base directory as `apps/mobile`.
- Keep production, preview, and development profiles unchanged unless EAS validation identifies a schema issue.

### Track B: Development-client setup

**File manifest:**

| Action | Path | Description |
| --- | --- | --- |
| EDIT | `apps/mobile/package.json` | Add SDK-compatible `expo-dev-client` and explicit Expo scripts |
| EDIT | `bun.lock` | Record resolved development-client dependency |
| EDIT | `README.md` | Explain build versus Metro restart |
| EDIT | `AGENTS.md` | Require native rebuild after native dependency/config changes |
| EDIT | `scripts/steps.ts` | Make first-build instructions use app-root Expo commands |

**Implementation details:**

- Install from `apps/mobile` with `bun expo install expo-dev-client`.
- Keep `ios: expo run:ios` and `android: expo run:android`.
- Add `doctor: expo-doctor` and `prebuild: expo prebuild` if they improve discoverability.
- Use `start: expo start`; Expo automatically targets the dev client when installed.
- Do not describe root aliases as Expo-standard commands.

### Track C: Native dependency ownership

**File manifest:**

| Action | Path | Description |
| --- | --- | --- |
| EDIT | `apps/mobile/package.json` | Declare app-runtime native SDKs explicitly |
| EDIT | `packages/auth/package.json` | Move app-native SDKs to peer/dev ownership |
| EDIT | `packages/observability/package.json` | Make Sentry app-visible while retaining wrapper API |
| EDIT | `packages/payments/package.json` | Make RevenueCat app-visible while retaining wrapper API |
| EDIT | `packages/notifications/package.json` | Make Expo notification modules app-visible |
| EDIT | `packages/updates/package.json` | Make Expo Updates app-visible |
| EDIT | `packages/analytics/package.json` | Evaluate PostHog runtime ownership consistently |
| EDIT | `scripts/vendors.ts` | Remove both wrapper and app dependency for optional vendors |
| EDIT | `tooling/pins.json` | Add only native-coupled versions not already represented |
| EDIT | `bun.lock` | Resolve exactly one compatible native SDK copy |

**Implementation details:**

- App code continues importing only `@repo/*`; this track changes dependency ownership, not import surfaces.
- For each native SDK, prefer an app dependency plus wrapper peer dependency. Add a wrapper dev dependency only when isolated package typechecking requires it.
- Use Expo-compatible versions and preserve all existing crash-grade pins.
- Update `tooling/pins.json` first for every newly app-visible native-coupled version, then mirror the approved specifier into app, peer, and development manifests.
- Regenerate `bun.lock` with `bun install` and prove CI's frozen-lockfile contract with `bun install --frozen-lockfile`.
- Verify recursive autolinking resolves one copy.
- Treat PostHog separately if its current package has no native linking requirement; consistency must not create unnecessary direct dependencies.

### Track D: Scaffold and documentation alignment

**File manifest:**

| Action | Path | Description |
| --- | --- | --- |
| EDIT | `README.md` | Publish canonical repository/app command matrix |
| EDIT | `.github/CONTRIBUTING.md` | Use app-root Expo, env, and EAS commands |
| EDIT | `AGENTS.md` | Encode agent-first ownership boundaries |
| EDIT | `scripts/initialize.ts` | Generate correct app-root paths and commands |
| EDIT | `scripts/steps.ts` | Generate correct EAS and rebuild steps |
| EDIT | `scripts/scaffold-agents.ts` | Preserve revised guidance in scaffolds |
| EDIT | `scripts/vendors.ts` | Keep optional removal complete |

**Implementation details:**

Document this command matrix:

```text
Repository root:
  bun install
  bunx turbo lint typecheck test
  bunx tsup

Expo app root (apps/mobile):
  bun expo start
  bun ios
  bun android
  bunx expo-doctor
  eas init / eas build / eas update
```

Generated guidance must explicitly distinguish:

- JavaScript changes → Metro reload.
- `EXPO_PUBLIC_*` changes → Metro restart.
- Native dependency/config plugin changes → native rebuild.
- EAS configuration → app-root EAS commands.

### Track E: Verification and release gate

**File manifest:**

| Action | Path | Description |
| --- | --- | --- |
| EDIT | relevant tests | Add path, dependency-removal, and inert-native coverage |
| VERIFY | fresh temporary scaffold | Confirm generated app behavior |
| VERIFY | iOS simulator build | Confirm native modules and development client |
| VERIFY | Android build or CI lane | Confirm native parity |

**Implementation details:**

1. Run package-level tests while editing.
2. Run full Turbo gate.
3. Run Expo Doctor from `apps/mobile`.
4. Build CLI and test a committed local template in a temporary directory.
5. Run the wizard end-to-end with all optional vendors retained; require install, frozen-lockfile install, and typecheck success.
6. Run the wizard end-to-end with PostHog, Sentry, and RevenueCat removed; require install, frozen-lockfile install, typecheck success, and no stale app dependencies or source anchors.
7. Verify generated `eas.json`, `.eas/workflows`, env files, dependency ownership, and `NEXT_STEPS.md` in both variants.
8. Build iOS and smoke RevenueCat, Clerk, notifications, Sentry initialization, and routing.
9. Run Android smoke or record it as a production blocker.

## 9. ISC — Ideal State Criteria

### Criteria

- [ ] ISC-C1: Expo project files reside exclusively under apps/mobile app root
- [ ] ISC-C2: EAS commands resolve configuration from apps/mobile without path overrides
- [ ] ISC-C3: Development builds include expo-dev-client in every generated scaffold
- [ ] ISC-C4: Native SDK versions remain visible to Expo app tooling
- [ ] ISC-C5: Vendor quarantine remains enforced through @repo package import surfaces
- [ ] ISC-C6: Optional vendor removal deletes app dependency and wrapper wiring
- [ ] ISC-C7: Full repository gate passes with zero type or lint errors
- [ ] ISC-C8: Fresh scaffold builds RevenueCat into an iOS development client
- [ ] ISC-C9: Generated guidance distinguishes Metro restarts from native rebuilds
- [ ] ISC-C10: Expo Doctor reports zero actionable native dependency failures

### Anti-criteria

- [ ] ISC-A1: Repository-root EAS configuration cannot remain after migration completes
- [ ] ISC-A2: App code never imports quarantined vendor SDK APIs directly
- [ ] ISC-A3: Native dependency changes never rely on Metro reload alone
- [ ] ISC-A4: Root convenience scripts never masquerade as canonical Expo commands
- [ ] ISC-A5: Optional vendor removal never leaves unused native SDK dependencies

## 10. Verification checklist

### P0 — Must pass to ship

- [ ] `bunx turbo lint typecheck test` exits zero.
- [ ] `cd apps/mobile && bunx expo-doctor` has zero actionable failures.
- [ ] `rg --files -g 'eas.json'` returns only `apps/mobile/eas.json`.
- [ ] `rg --files -g '*.yml' apps/mobile/.eas/workflows` returns both workflows.
- [ ] `rg 'move eas.json to the repo root' README.md AGENTS.md scripts` returns no matches.
- [ ] `bun install --frozen-lockfile` succeeds after dependency ownership changes.
- [ ] Full-vendor scaffold installs with frozen lockfile and typechecks successfully.
- [ ] Removed-vendor scaffold installs with frozen lockfile and typechecks successfully.
- [ ] Removed-vendor scaffold contains no stale native dependency or source anchor.
- [ ] iOS development client boots with RevenueCat configured and linked.

### P1 — Blocking for production

- [ ] EAS development profile creates an installable development client.
- [ ] EAS preview update resolves the app-local workflow and channel.
- [ ] RevenueCat optional removal produces no payment code or native dependency.
- [ ] Android development build boots with all retained native vendors.

### P2 — Follow-up

- [ ] Add an automated app-root ownership check to CI.
- [ ] Add Expo Doctor to CI when its output is deterministic.
- [ ] Evaluate an agent-facing root command dispatcher without changing canonical docs.

## 11. Scope exclusions

- **Removing Turborepo or Bun workspaces** — contradicted by the agent-first package strategy and unrelated to observed native failures.
- **Flattening vendor packages** — would change the product architecture rather than align Expo boundaries.
- **Changing vendor providers** — Clerk, Supabase, RevenueCat, PostHog, and Sentry remain selected.
- **Provisioning store products or EAS credentials** — requires external accounts and human authorization.
- **Changing UI behavior** — paywall, feed, profile, and notification UX are outside this infrastructure plan.
- **Editing `ISA.md` automatically** — it remains the human/primary-agent system of record.

## 12. Agent decomposition

| Agent | Tracks | Files | Dependencies |
| --- | --- | ---: | --- |
| Expo/EAS agent | A, B | 8-10 | None |
| Dependency agent | C | 8-10 | None |
| Scaffold/docs agent | D | 6-8 | A-C decisions finalized |
| Verification agent | E | tests + temporary scaffold | A-D complete |

Parallel agents must not edit the same manifests simultaneously. The parent agent owns final dependency reconciliation, lockfile generation, scaffold transformation anchors, and the full verification gate.
