import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { templateRef, templateUrl } from "./initialize";

// Publish-time release guard. The published CLI clones `templateRef` from
// GitHub, so a publish that lands before its tag is pushed ships a wizard
// whose every scaffold dies on `git clone --branch <missing tag>`. Nothing
// else can catch this: pins.test.ts asserts the ref matches the version, but
// at the release commit the tag legitimately does not exist yet, so tag
// existence can only be checked here — at the moment of publishing.

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(
	readFileSync(join(root, "package.json"), "utf8"),
) as { version: string };

const failures: string[] = [];
const expectedRef = `v${manifest.version}`;

if (templateRef !== expectedRef) {
	failures.push(
		`templateRef is "${templateRef}" but package.json version is ${manifest.version}.\n` +
			`  Fix: set templateRef to "${expectedRef}" in scripts/initialize.ts.`,
	);
}

// The published artifact. `files` ships only this, so an unbuilt or stale
// dist publishes the previous release's CLI under the new version number.
if (!existsSync(join(root, "dist", "index.js"))) {
	failures.push("dist/index.js is missing.\n  Fix: run `bunx tsup`.");
}

// The tag must be on the remote, not merely local — the CLI clones from
// GitHub, and a local-only tag resolves for the maintainer and nobody else.
try {
	const found = execFileSync(
		"git",
		["ls-remote", "--tags", templateUrl, expectedRef],
		{ encoding: "utf8" },
	).trim();

	if (!found) {
		failures.push(
			`tag ${expectedRef} does not exist on ${templateUrl}.\n` +
				`  Every scaffold would fail on \`git clone --branch ${expectedRef}\`.\n` +
				`  Fix: git tag -a ${expectedRef} -m "create-expo-forge ${manifest.version}" && git push origin ${expectedRef}`,
		);
	}
} catch (error) {
	failures.push(
		`could not reach ${templateUrl} to verify tag ${expectedRef}: ${(error as Error).message}\n` +
			"  Fix: restore network access — publishing unverified risks shipping a CLI that cannot clone.",
	);
}

if (failures.length > 0) {
	console.error(
		`\nRefusing to publish create-expo-forge ${manifest.version}:\n\n${failures
			.map((failure) => `- ${failure}`)
			.join("\n\n")}\n`,
	);
	process.exit(1);
}

console.log(
	`create-expo-forge ${manifest.version}: templateRef ${templateRef} is tagged and pushed, dist built.`,
);
