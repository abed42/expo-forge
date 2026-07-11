import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
	cancel,
	intro,
	isCancel,
	log,
	note,
	outro,
	select,
	spinner,
	text,
} from "@clack/prompts";
import { transformScaffoldAgentsMd } from "./scaffold-agents";
import {
	buildPendingSteps,
	type KeyReport,
	type KeyStatus,
	renderNextSteps,
} from "./steps";
import {
	removalEdits,
	type Vendor,
	type VendorKeySpec,
	type VendorRemoval,
	vendors,
} from "./vendors";

export const templateUrl = "https://github.com/abed42/expo-forge.git";

export type InitOptions = {
	name?: string;
	bundleId?: string;
	template?: string;
	clerkKey?: string;
	supabaseUrl?: string;
	supabaseKey?: string;
	skipOptional?: boolean;
	remove?: string;
	yes?: boolean;
	json?: boolean;
};

type VendorDecision = {
	vendor: Vendor;
	action: "keep" | "remove";
	values: Record<string, string>;
};

const namePattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const bundleIdPattern = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

// CLI flags that pre-answer env prompts (non-interactive use).
const flagEnvValues = (
	options: InitOptions,
): Record<string, string | undefined> => ({
	EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: options.clerkKey,
	EXPO_PUBLIC_SUPABASE_URL: options.supabaseUrl,
	EXPO_PUBLIC_SUPABASE_KEY: options.supabaseKey,
});

// UI seam: interactive mode renders clack; --json mode stays silent on stdout
// (reserved for the single JSON result line) and routes warnings to stderr.
type UiSpinner = {
	start: (message?: string) => void;
	message: (message?: string) => void;
	stop: (message?: string) => void;
};

type Ui = {
	intro: (message: string) => void;
	outro: (message: string) => void;
	note: (message: string, title?: string) => void;
	warn: (message: string) => void;
	error: (message: string) => void;
	spinner: () => UiSpinner;
};

const createUi = (json: boolean): Ui =>
	json
		? {
				intro: () => {},
				outro: () => {},
				note: () => {},
				warn: (message) => console.error(`warn: ${message}`),
				error: (message) => console.error(`error: ${message}`),
				spinner: () => ({
					start: () => {},
					message: () => {},
					stop: () => {},
				}),
			}
		: {
				intro,
				outro,
				note: (message, title) => note(message, title),
				warn: (message) => log.warn(message),
				error: (message) => log.error(message),
				spinner,
			};

const bail = (): never => {
	cancel("Operation cancelled.");
	process.exit(0);
};

const run = (command: string, args: string[], cwd?: string) => {
	const result = spawnSync(command, args, {
		cwd,
		stdio: "pipe",
		encoding: "utf8",
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		const stderr = result.stderr?.toString().trim();
		throw new Error(stderr || `Command failed: ${command} ${args.join(" ")}`);
	}

	return result;
};

const titleCase = (name: string) =>
	name
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");

const readJson = async (path: string) =>
	JSON.parse(await readFile(path, "utf8"));

const writeJson = (path: string, value: unknown) =>
	writeFile(path, `${JSON.stringify(value, null, "\t")}\n`);

const resolveName = async (options: InitOptions): Promise<string> => {
	if (options.name) {
		if (!namePattern.test(options.name)) {
			throw new Error(
				`Invalid app name "${options.name}" — use kebab-case (lowercase letters, digits, hyphens), e.g. my-app.`,
			);
		}
		return options.name;
	}

	if (options.yes) {
		throw new Error(
			`${options.json ? "--json" : "--yes"} runs non-interactively and requires an app name (positional or --name).`,
		);
	}

	const value = await text({
		message: "What is your app named?",
		placeholder: "my-app",
		validate(input: string | undefined) {
			if (!input || input.length === 0) {
				return "Please enter an app name.";
			}
			if (!namePattern.test(input)) {
				return "Use kebab-case: lowercase letters, digits, hyphens (e.g. my-app).";
			}
		},
	});

	if (isCancel(value)) {
		bail();
	}

	return value.toString();
};

const resolveBundleId = async (
	options: InitOptions,
	name: string,
): Promise<string> => {
	const fallback = `com.example.${name.replace(/-/g, "")}`;

	if (options.bundleId) {
		if (!bundleIdPattern.test(options.bundleId)) {
			throw new Error(
				`Invalid bundle identifier "${options.bundleId}" — use reverse-DNS, e.g. com.example.myapp.`,
			);
		}
		return options.bundleId;
	}

	if (options.yes) {
		return fallback;
	}

	const value = await text({
		message: "Bundle identifier? (iOS bundleIdentifier + Android package)",
		placeholder: fallback,
		defaultValue: fallback,
		validate(input: string | undefined) {
			if (input && input.length > 0 && !bundleIdPattern.test(input)) {
				return "Use reverse-DNS, e.g. com.example.myapp.";
			}
		},
	});

	if (isCancel(value)) {
		bail();
	}

	return value.toString();
};

const parseRemoveFlag = (options: InitOptions): Set<string> => {
	if (!options.remove) {
		return new Set();
	}

	const optionalIds = vendors.filter((v) => !v.required).map((v) => v.id);
	const ids = options.remove
		.split(",")
		.map((id) => id.trim())
		.filter(Boolean);

	for (const id of ids) {
		if (!optionalIds.includes(id as Vendor["id"])) {
			throw new Error(
				`--remove: "${id}" is not an optional vendor. Options: ${optionalIds.join(", ")}.`,
			);
		}
	}

	return new Set(ids);
};

const cloneTemplate = (template: string, targetDir: string) => {
	const localPath = resolve(template);

	if (existsSync(localPath)) {
		// Local template (development / testing) — git ignores --depth here.
		run("git", ["clone", localPath, targetDir]);
	} else {
		run("git", ["clone", "--depth", "1", template, targetDir]);
	}
};

// Template-repo internals that must not ship in a scaffolded app.
const internalPaths = [
	".git",
	"scripts",
	"dist",
	"tsup.config.ts",
	join(".github", "assets"),
	"ISA.md",
	".agents",
	"skills-lock.json",
];

const stripInternals = async (targetDir: string) => {
	for (const path of internalPaths) {
		await rm(join(targetDir, path), { recursive: true, force: true });
	}

	run("git", ["init", "-q"], targetDir);
};

const transformRootPackageJson = async (targetDir: string, name: string) => {
	const path = join(targetDir, "package.json");
	const pkg = await readJson(path);

	const devDependencies = { ...pkg.devDependencies };
	delete devDependencies.tsup;

	// The CLI's own tests live in scripts/, which stripInternals removes —
	// the hook would fail every scaffolded `turbo test` run if it shipped.
	const scripts = { ...pkg.scripts };
	delete scripts["test:scripts"];

	// Rebuild with an explicit whitelist: drops the npm-publishing fields
	// (bin, files, publishConfig, homepage, repository, keywords, description,
	// type) and the CLI-only runtime dependencies.
	await writeJson(path, {
		name,
		version: "0.0.1",
		private: true,
		license: pkg.license,
		workspaces: pkg.workspaces,
		packageManager: pkg.packageManager,
		scripts,
		overrides: pkg.overrides,
		devDependencies,
	});
};

// Companion to the test:scripts removal above: turbo.json's //#test:scripts
// root task points at the same stripped scripts/ directory. Anchor-exact
// string surgery (like removalEdits) rather than a JSON round-trip, so the
// file keeps its biome formatting and the scaffold's own lint gate passes.
const transformTurboJson = async (
	targetDir: string,
	warn: (message: string) => void,
) => {
	const path = join(targetDir, "turbo.json");
	const content = await readFile(path, "utf8");
	const find =
		'\t\t"test": {\n\t\t\t"dependsOn": ["//#test:scripts"]\n\t\t},\n\t\t"//#test:scripts": {},\n';

	if (!content.includes(find)) {
		warn(
			"turbo.json anchor not found — remove the //#test:scripts root task manually.",
		);
		return;
	}

	await writeFile(path, content.replace(find, '\t\t"test": {},\n'));
};

const writeReadme = async (targetDir: string, name: string) => {
	const readme = [
		`# ${titleCase(name)}`,
		"",
		"Built with [expo-forge](https://github.com/abed42/expo-forge) — a production-grade template for Expo apps.",
		"",
		"```sh",
		"bun install",
		"cd apps/mobile && bun ios",
		"```",
		"",
		"Environment keys live **only** in `apps/mobile/.env.local` (copy from `apps/mobile/.env.example`). A repo-root `.env.local` is not loaded by Expo.",
		"",
		"Remaining setup steps live in [NEXT_STEPS.md](NEXT_STEPS.md).",
		"",
	].join("\n");

	await writeFile(join(targetDir, "README.md"), readme);
};

const renameApp = async (targetDir: string, name: string, bundleId: string) => {
	const path = join(targetDir, "apps", "mobile", "app.json");
	const config = await readJson(path);
	const expo = config.expo ?? {};

	expo.name = titleCase(name);
	expo.slug = name;
	expo.scheme = name.replace(/-/g, "");
	expo.ios = { ...expo.ios, bundleIdentifier: bundleId };
	expo.android = { ...expo.android, package: bundleId };
	config.expo = expo;

	await writeJson(path, config);
};

const promptKey = async (
	vendor: Vendor,
	key: VendorKeySpec,
): Promise<string> => {
	const value = await text({
		message: `${key.label}? (${vendor.hint} — leave empty to skip for now)`,
		placeholder: key.placeholder,
		validate(input: string | undefined) {
			if (input && input.length > 0) {
				return key.validate(input);
			}
		},
	});

	if (isCancel(value)) {
		bail();
	}

	return value.toString().trim();
};

const collectVendor = async (
	vendor: Vendor,
	options: InitOptions,
	removeSet: Set<string>,
): Promise<VendorDecision> => {
	if (!vendor.required && removeSet.has(vendor.id)) {
		return { vendor, action: "remove", values: {} };
	}

	const flags = flagEnvValues(options);
	const values: Record<string, string> = {};
	let missing = false;

	for (const key of vendor.keys) {
		const flagValue = flags[key.env];
		if (flagValue === undefined) {
			missing = true;
		} else {
			const error = key.validate(flagValue);
			if (error) {
				throw new Error(`${key.env}: ${error}`);
			}
			values[key.env] = flagValue;
		}
	}

	if (!missing) {
		return { vendor, action: "keep", values };
	}

	// Non-interactive: unanswered keys stay blank ("skip for now").
	if (options.yes || (!vendor.required && options.skipOptional)) {
		return { vendor, action: "keep", values };
	}

	if (vendor.required) {
		for (const key of vendor.keys) {
			if (values[key.env] === undefined) {
				values[key.env] = await promptKey(vendor, key);
			}
		}
		return { vendor, action: "keep", values };
	}

	const choice = await select({
		message: `${vendor.name} (optional)`,
		options: [
			{ value: "enter", label: `Enter ${vendor.name} key` },
			{
				value: "skip",
				label: "Skip for now",
				hint: "keeps the package; add the key later",
			},
			{
				value: "remove",
				label: "Remove",
				hint: `deletes packages/${vendor.removal?.pkg} and its wiring`,
			},
		],
	});

	if (isCancel(choice)) {
		bail();
	}

	if (choice === "remove") {
		return { vendor, action: "remove", values: {} };
	}

	if (choice === "enter") {
		for (const key of vendor.keys) {
			values[key.env] = await promptKey(vendor, key);
		}
	}

	return { vendor, action: "keep", values };
};

const removeVendorPackage = async (
	targetDir: string,
	removal: VendorRemoval,
	warn: (message: string) => void,
) => {
	const { pkg, appDependencies, appFiles = [] } = removal;
	await rm(join(targetDir, "packages", pkg), {
		recursive: true,
		force: true,
	});

	const mobilePkgPath = join(targetDir, "apps", "mobile", "package.json");
	const mobilePkg = await readJson(mobilePkgPath);
	let packageChanged = false;
	if (mobilePkg.dependencies?.[`@repo/${pkg}`]) {
		delete mobilePkg.dependencies[`@repo/${pkg}`];
		packageChanged = true;
	}
	for (const dependency of appDependencies) {
		if (mobilePkg.dependencies?.[dependency]) {
			delete mobilePkg.dependencies[dependency];
			packageChanged = true;
		}
	}
	if (packageChanged) {
		await writeJson(mobilePkgPath, mobilePkg);
	}
	for (const appFile of appFiles) {
		await rm(join(targetDir, appFile), { force: true });
	}

	for (const edit of removalEdits[pkg]) {
		const filePath = join(targetDir, edit.file);
		const content = await readFile(filePath, "utf8");

		if (!content.includes(edit.find)) {
			warn(
				`Removal anchor not found in ${edit.file} — leaving it untouched. Remove the @repo/${pkg} reference manually.`,
			);
			continue;
		}

		await writeFile(filePath, content.replace(edit.find, edit.replace));
	}
};

const writeEnvFile = async (targetDir: string, decisions: VendorDecision[]) => {
	const lines = [
		"# Generated by create-expo-forge.",
		"# Values are validated at boot by packages/*/src/keys.ts — missing",
		"# required keys fail loud (EXPO_PUBLIC_SKIP_ENV_VALIDATION=true to bypass).",
	];

	for (const decision of decisions) {
		if (decision.action === "remove") {
			continue;
		}

		const { vendor, values } = decision;
		lines.push(
			"",
			`# ${vendor.name}${vendor.required ? "" : " (optional — no-ops when unset)"} — ${vendor.hint}`,
		);

		for (const key of vendor.keys) {
			lines.push(`${key.env}=${values[key.env] ?? ""}`);
		}
	}

	await writeFile(
		join(targetDir, "apps", "mobile", ".env.local"),
		`${lines.join("\n")}\n`,
	);
};

// Collapses vendor decisions into the per-key statuses the --json contract
// reports and the pending-step generator consumes.
const buildKeyReport = (decisions: VendorDecision[]): KeyReport => {
	const byId = new Map(decisions.map((d) => [d.vendor.id, d]));

	const status = (id: Vendor["id"], env: string): KeyStatus => {
		const decision = byId.get(id);
		if (!decision || decision.action === "remove") {
			return "removed";
		}
		return decision.values[env] ? "set" : "skipped";
	};

	return {
		clerk: status("clerk", "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"),
		supabaseUrl: status("supabase", "EXPO_PUBLIC_SUPABASE_URL"),
		supabaseKey: status("supabase", "EXPO_PUBLIC_SUPABASE_KEY"),
		posthog: status("posthog", "EXPO_PUBLIC_POSTHOG_KEY"),
		sentry: status("sentry", "EXPO_PUBLIC_SENTRY_DSN"),
		revenuecat: status("revenuecat", "EXPO_PUBLIC_REVENUECAT_API_KEY"),
	};
};

export const initialize = async (options: InitOptions) => {
	const json = Boolean(options.json);
	const ui = createUi(json);
	// --json implies non-interactive: missing values are skipped, never prompted.
	const effective: InitOptions = json ? { ...options, yes: true } : options;
	// Tracks the phase for the { ok: false, failedStep } error contract.
	let failedStep = "validate-options";

	try {
		ui.intro("∧ expo-forge");

		const name = await resolveName(effective);
		const targetDir = join(process.cwd(), name);

		if (existsSync(targetDir)) {
			throw new Error(`Directory "${name}" already exists.`);
		}

		const bundleId = await resolveBundleId(effective, name);
		const removeSet = parseRemoveFlag(effective);
		const template = effective.template ?? templateUrl;

		failedStep = "clone-template";
		const scaffold = ui.spinner();
		scaffold.start(`Cloning expo-forge from ${template}...`);
		cloneTemplate(template, targetDir);

		failedStep = "strip-internals";
		scaffold.message("Stripping template internals...");
		await stripInternals(targetDir);

		failedStep = "transform-scaffold";
		scaffold.message("Renaming app...");
		await transformRootPackageJson(targetDir, name);
		await transformTurboJson(targetDir, ui.warn);
		await writeReadme(targetDir, name);
		await renameApp(targetDir, name, bundleId);
		await transformScaffoldAgentsMd(targetDir, name, ui.warn);
		scaffold.stop(`Scaffolded ${name} (${bundleId}).`);

		failedStep = "collect-vendors";
		const decisions: VendorDecision[] = [];
		for (const vendor of vendors) {
			decisions.push(await collectVendor(vendor, effective, removeSet));
		}

		failedStep = "apply-vendors";
		const finalize = ui.spinner();
		finalize.start("Finalizing...");

		for (const decision of decisions) {
			if (decision.action === "remove" && decision.vendor.removal) {
				finalize.message(`Removing packages/${decision.vendor.removal.pkg}...`);
				await removeVendorPackage(targetDir, decision.vendor.removal, ui.warn);
			}
		}

		finalize.message("Writing apps/mobile/.env.local...");
		await writeEnvFile(targetDir, decisions);

		failedStep = "install";
		finalize.message("Installing dependencies with bun (may take a minute)...");
		let installed = true;
		try {
			run("bun", ["install"], targetDir);
		} catch (error) {
			// Non-fatal: the scaffold is complete; surface install as a pending step.
			installed = false;
			ui.warn(
				`bun install failed — run it manually in ${name}/. (${
					error instanceof Error ? error.message : error
				})`,
			);
		}

		if (installed) {
			failedStep = "format-transformed-sources";
			finalize.message("Formatting transformed app sources...");
			run("bunx", ["biome", "check", "--write", "apps/mobile/src"], targetDir);
		}

		failedStep = "write-next-steps";
		const keys = buildKeyReport(decisions);
		const pendingSteps = buildPendingSteps(keys, installed);
		await writeFile(
			join(targetDir, "NEXT_STEPS.md"),
			renderNextSteps(name, pendingSteps),
		);
		finalize.stop(installed ? "Dependencies installed." : "Finalized.");

		const blankRequired = decisions.flatMap((decision) =>
			decision.vendor.required
				? decision.vendor.keys
						.filter((key) => !decision.values[key.env])
						.map((key) => key.env)
				: [],
		);

		if (blankRequired.length > 0) {
			ui.warn(
				`Required keys skipped — the app fails loud at boot until you set: ${blankRequired.join(", ")}`,
			);
		}

		ui.note(
			[
				`cd ${name}`,
				"NEXT_STEPS.md               # full checklist — browser steps need you, the rest an agent can run",
				"cd apps/mobile && bun ios   # dev-client build — Xcode required, iOS 17.0 target",
				"apps/mobile/.env.local      # add any skipped keys (Clerk: dashboard.clerk.com)",
				"cd apps/mobile && eas init  # EAS config belongs in the Expo app root",
			].join("\n"),
			"Next steps",
		);

		ui.outro("Your expo-forge app is ready.");

		if (json) {
			// Contract: exactly one JSON object, the last line on stdout.
			console.log(
				JSON.stringify({
					ok: true,
					appName: name,
					directory: targetDir,
					bundleId,
					keys,
					installed,
					pendingSteps,
				}),
			);
		}
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: `Failed to initialize project: ${error}`;

		if (json) {
			console.log(JSON.stringify({ ok: false, error: message, failedStep }));
		} else {
			log.error(message);
		}

		process.exit(1);
	}
};
