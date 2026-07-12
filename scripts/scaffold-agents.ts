import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Rewrites the scaffold's AGENTS.md from the template-maintainer guide into
// an app guide: keeps commands, pins (as consume-don't-change), architecture
// rules, env-via-CLIs, and verification expectations; drops the CLI/publishing
// and template-maintainer content; adds a pointer to NEXT_STEPS.md.
//
// Same contract as vendors.ts removalEdits: every `find` is the EXACT current
// text of the template's AGENTS.md. If the template drifts, we warn and keep
// the original text for that section instead of corrupting the guide.

type Warn = (message: string) => void;

type AnchorEdit = {
	/** Short label used in drift warnings. */
	label: string;
	find: string;
	replace: string;
};

const agentsMdEdits = (name: string): AnchorEdit[] => [
	{
		label: "title",
		find: "# expo-forge — agent guide",
		replace: `# ${name} — agent guide`,
	},
	{
		label: "intro paragraph",
		find: "Production-grade template for Expo apps. Bun workspaces + Turborepo monorepo. One app (`apps/mobile`), vendor-quarantine packages (`packages/*`), publishable CLI at the repo root (`scripts/` → `dist/`, npm name `create-expo-forge`).",
		replace: [
			"App scaffolded from [expo-forge](https://github.com/abed42/expo-forge). Bun workspaces + Turborepo monorepo. One app (`apps/mobile`), vendor-quarantine packages (`packages/*`).",
			"",
			"Remaining setup (vendor keys, first build, migrations, EAS, Clerk↔Supabase wiring) lives in [NEXT_STEPS.md](NEXT_STEPS.md) — check it before assuming a vendor is configured. Steps marked browser/human there require interactive auth an agent cannot do.",
		].join("\n"),
	},
	{
		label: "CLI build command bullet",
		find: "- CLI: `bunx tsup` builds `scripts/index.ts` → `dist/index.js`. Test locally: `node dist/index.js init test-app --template <this-repo-path> --yes ...` (see `--help` for non-interactive flags).\n",
		replace: "",
	},
	{
		label: "pins framing",
		find: "`tooling/pins.json` is the single source for native-coupled versions. Non-negotiable pins with reasons:",
		replace:
			"`tooling/pins.json` is the single source for native-coupled versions. These pins ship with the template — consume them, don't change them; each exists for a crash-grade reason:",
	},
	{
		label: "do-not-touch section",
		find: "## Do not touch without explicit instruction\n\n`apps/mobile/.env.local` (user secrets), `tooling/pins.json` values, published npm metadata in root `package.json` (`name`, `bin`, `files`, `publishConfig`).",
		replace:
			"## Do not touch without explicit instruction\n\n`apps/mobile/.env.local` (user secrets) and `tooling/pins.json` values.",
	},
];

/**
 * Removes a `##` section (header line through the character before the next
 * `## ` header, or EOF). Returns the original content, warning, when the
 * header is missing.
 */
const removeSection = (content: string, header: string, warn: Warn): string => {
	const headerIndex = content.indexOf(`\n${header}\n`);

	if (headerIndex === -1) {
		warn(
			`AGENTS.md section "${header}" not found — template drifted; leaving it as-is.`,
		);
		return content;
	}

	const start = headerIndex + 1;
	const next = content.indexOf("\n## ", start);
	const end = next === -1 ? content.length : next + 1;

	return content.slice(0, start) + content.slice(end);
};

export const transformScaffoldAgentsMd = async (
	targetDir: string,
	name: string,
	warn: Warn,
) => {
	const path = join(targetDir, "AGENTS.md");

	let content: string;
	try {
		content = await readFile(path, "utf8");
	} catch {
		warn("AGENTS.md not found in scaffold — skipping the agent-guide rewrite.");
		return;
	}

	// Template-repo-only section (documents running the CLI from inside the
	// template repo) — meaningless in a scaffold.
	content = removeSection(content, "## Using this CLI as an agent", warn);

	for (const edit of agentsMdEdits(name)) {
		if (!content.includes(edit.find)) {
			warn(
				`AGENTS.md anchor not found (${edit.label}) — template drifted; leaving that section as-is.`,
			);
			continue;
		}
		content = content.replace(edit.find, edit.replace);
	}

	await writeFile(path, content);
};
