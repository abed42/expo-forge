#!/usr/bin/env node
import { Command } from "commander";
import { type InitOptions, initialize, templateUrl } from "./initialize";

// next-forge pattern: this file compiles to dist/index.js and is the only
// artifact published to npm. The template itself is cloned from GitHub at
// init time, never bundled.

const withInitOptions = (command: Command): Command =>
	command
		.argument("[name]", "app name (kebab-case) — also the target directory")
		.option("--name <name>", "app name (overrides the positional)")
		.option(
			"--bundle-id <id>",
			"reverse-DNS bundle identifier (default: com.example.<name>)",
		)
		.option(
			"--template <url-or-path>",
			"template git URL or local path",
			templateUrl,
		)
		.option("--clerk-key <key>", "Clerk publishable key (pk_...)")
		.option("--supabase-url <url>", "Supabase project URL (https://...)")
		.option("--supabase-key <key>", "Supabase publishable key")
		.option(
			"--skip-optional",
			"skip optional vendors (PostHog, Sentry, RevenueCat) without prompting",
		)
		.option(
			"--remove <vendors>",
			"comma-separated optional vendors to strip out (posthog,sentry,revenuecat)",
		)
		.option(
			"--yes",
			"non-interactive: use flags and defaults, leave unanswered keys blank",
		)
		.action((name: string | undefined, _options: InitOptions, cmd: Command) => {
			// optsWithGlobals: the root command defines the same flags as the
			// `init` subcommand, and commander stores flags parsed after the
			// subcommand name on the root — merge both.
			const options = cmd.optsWithGlobals() as InitOptions;
			return initialize({ ...options, name: options.name ?? name });
		});

const program = new Command()
	.name("create-expo-forge")
	.description("∧ expo-forge — production-grade template for Expo apps");

withInitOptions(program);
withInitOptions(
	program.command("init").description("Scaffold a new expo-forge app"),
);

program.parse();
