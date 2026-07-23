import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { templateRef } from "./initialize";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

type Manifest = {
	version?: string;
	packageManager?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

function readManifest(...segments: string[]): Manifest {
	return JSON.parse(readFileSync(join(repoRoot, ...segments), "utf8"));
}

const pinsFile = readManifest("tooling", "pins.json") as unknown as {
	pins: Record<string, string>;
};
const { pins } = pinsFile;

const rootManifest = readManifest("package.json");
const appManifest = readManifest("apps", "mobile", "package.json");

// Every manifest that may declare a pinned package. A pin is authoritative
// wherever it appears: a spec that drifts in one manifest but not the other
// still ships a mismatched tree.
const manifests = [
	{ name: "package.json", manifest: rootManifest },
	{ name: "apps/mobile/package.json", manifest: appManifest },
] as const;

function specsFor(name: string) {
	return manifests
		.map(({ name: file, manifest }) => ({
			file,
			spec: { ...manifest.dependencies, ...manifest.devDependencies }[name],
		}))
		.filter((entry): entry is { file: string; spec: string } =>
			Boolean(entry.spec),
		);
}

// tooling/pins.json is the single source for native-coupled versions
// (AGENTS.md). Nothing enforced that until this suite: `expo` had already
// drifted to ^57.0.7 in the app manifest while pins.json still said ~57.0.2.
describe("manifests match tooling/pins.json", () => {
	const packageNames = Object.keys(pins).filter(
		(name) => name !== "packageManager",
	);

	for (const name of packageNames) {
		it(`${name}: every manifest declaring it uses the pinned spec`, () => {
			const declarations = specsFor(name);

			expect(
				declarations.length,
				`${name} is pinned but no manifest depends on it — drop the pin or add the dependency`,
			).toBeGreaterThan(0);

			for (const { file, spec } of declarations) {
				expect(spec, `${file} declares ${name}@${spec}`).toBe(pins[name]);
			}
		});
	}

	it("packageManager matches the pinned Bun version", () => {
		expect(rootManifest.packageManager).toBe(pins.packageManager);
	});
});

// The published CLI clones this tag rather than main, so a version bump that
// forgets the ref ships a wizard that scaffolds the *previous* release.
describe("release refs stay in sync", () => {
	it("templateRef matches the published package version", () => {
		expect(templateRef).toBe(`v${rootManifest.version}`);
	});
});
