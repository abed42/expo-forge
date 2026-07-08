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
import {
	type RemovablePackage,
	removalEdits,
	type Vendor,
	type VendorKeySpec,
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
		throw new Error("--yes requires an app name (positional or --name).");
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
		scripts: pkg.scripts,
		overrides: pkg.overrides,
		devDependencies,
	});
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
		"Environment keys live in `apps/mobile/.env.local` (see `.env.example`).",
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
				hint: `deletes packages/${vendor.pkg} and its wiring`,
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
	pkg: RemovablePackage,
) => {
	await rm(join(targetDir, "packages", pkg), {
		recursive: true,
		force: true,
	});

	const mobilePkgPath = join(targetDir, "apps", "mobile", "package.json");
	const mobilePkg = await readJson(mobilePkgPath);
	if (mobilePkg.dependencies?.[`@repo/${pkg}`]) {
		delete mobilePkg.dependencies[`@repo/${pkg}`];
		await writeJson(mobilePkgPath, mobilePkg);
	}

	for (const edit of removalEdits[pkg]) {
		const filePath = join(targetDir, edit.file);
		const content = await readFile(filePath, "utf8");

		if (!content.includes(edit.find)) {
			log.warn(
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

export const initialize = async (options: InitOptions) => {
	try {
		intro("∧ expo-forge");

		const name = await resolveName(options);
		const targetDir = join(process.cwd(), name);

		if (existsSync(targetDir)) {
			throw new Error(`Directory "${name}" already exists.`);
		}

		const bundleId = await resolveBundleId(options, name);
		const removeSet = parseRemoveFlag(options);
		const template = options.template ?? templateUrl;

		const scaffold = spinner();
		scaffold.start(`Cloning expo-forge from ${template}...`);
		cloneTemplate(template, targetDir);
		scaffold.message("Stripping template internals...");
		await stripInternals(targetDir);
		scaffold.message("Renaming app...");
		await transformRootPackageJson(targetDir, name);
		await writeReadme(targetDir, name);
		await renameApp(targetDir, name, bundleId);
		scaffold.stop(`Scaffolded ${name} (${bundleId}).`);

		const decisions: VendorDecision[] = [];
		for (const vendor of vendors) {
			decisions.push(await collectVendor(vendor, options, removeSet));
		}

		const finalize = spinner();
		finalize.start("Finalizing...");

		for (const decision of decisions) {
			if (decision.action === "remove" && decision.vendor.pkg) {
				finalize.message(`Removing packages/${decision.vendor.pkg}...`);
				await removeVendorPackage(targetDir, decision.vendor.pkg);
			}
		}

		finalize.message("Writing apps/mobile/.env.local...");
		await writeEnvFile(targetDir, decisions);

		finalize.message("Installing dependencies with bun (may take a minute)...");
		run("bun", ["install"], targetDir);
		finalize.stop("Dependencies installed.");

		const blankRequired = decisions.flatMap((decision) =>
			decision.vendor.required
				? decision.vendor.keys
						.filter((key) => !decision.values[key.env])
						.map((key) => key.env)
				: [],
		);

		if (blankRequired.length > 0) {
			log.warn(
				`Required keys skipped — the app fails loud at boot until you set: ${blankRequired.join(", ")}`,
			);
		}

		note(
			[
				`cd ${name}`,
				"cd apps/mobile && bun ios   # dev-client build — Xcode required, iOS 17.0 target",
				"apps/mobile/.env.local      # add any skipped keys (Clerk: dashboard.clerk.com)",
				"eas init                    # when you're ready for EAS builds",
			].join("\n"),
			"Next steps",
		);

		outro("Your expo-forge app is ready.");
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: `Failed to initialize project: ${error}`;

		log.error(message);
		process.exit(1);
	}
};
