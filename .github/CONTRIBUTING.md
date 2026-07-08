# Contributing to expo-forge

Thank you for your interest in contributing! This document outlines the process for contributing to expo-forge.

## Getting Started

1. Fork the repository
2. Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test your changes thoroughly
5. Commit your changes with clear, descriptive commit messages
6. Push to your fork
7. Submit a Pull Request

## Development Setup

expo-forge uses [Bun](https://bun.sh) workspaces with [Turborepo](https://turborepo.com):

```sh
bun install
cp .env.example .env   # add your Clerk + Supabase keys
bun typecheck          # turbo typecheck across the workspace
bun lint               # turbo lint (Biome)
bun run fix            # biome check --write .
```

To run the app, use the dev-client workflow (not Expo Go):

```sh
cd apps/mobile && bun ios
```

### Things to know before touching dependencies

- **`tooling/pins.json` is the single source of truth** for native-coupled versions (Expo SDK, React Native, React, and related native modules). Update pins there first, then mirror them in package manifests. Do not bump `react-native-worklets` past exactly `0.10.0` or downgrade `react-native-reanimated` below `^4.5.1` — both pins are deliberate.
- **`bunfig.toml` forces the hoisted linker.** Metro requires it; don't change the linker setting.
- Use `bun` for everything — installing, running scripts, and creating branches of work. Don't introduce npm/yarn/pnpm lockfiles.

## Pull Request Guidelines

- Ensure your PR addresses a specific issue or adds value to the project
- Include a clear description of the changes
- Keep changes focused and atomic
- Follow existing code style and conventions
- Include tests if applicable
- Update documentation as needed
- Ensure `bun typecheck` and `bun lint` pass locally
- Ensure your PR follows the project's philosophy (see the README): Fast, Cheap, Opinionated, Modern, Safe

## Code Style

- Formatting and linting are handled by [Biome](https://biomejs.dev) 2 — run `bun run fix` before committing
- TypeScript strict mode everywhere; avoid `any`
- Write clear, self-documenting code
- Add comments only when necessary to explain complex logic (version pins and platform gotchas are good examples)
- Use meaningful variable and function names

## Reporting Issues

- Use the GitHub issue tracker
- Check if the issue already exists before creating a new one
- Provide a clear description of the issue
- Include steps to reproduce if applicable, plus device/simulator, OS version, and Expo SDK version
- Add relevant labels

## Questions or Need Help?

Feel free to open an issue for questions or join our discussions. We're here to help!

## Code of Conduct

Please note that this project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

Thank you for contributing!
