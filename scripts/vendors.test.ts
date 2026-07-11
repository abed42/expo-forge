import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { analyticsKeys } from "../packages/analytics/src/keys";
import { authKeys } from "../packages/auth/src/keys";
import { backendKeys } from "../packages/backend/src/keys";
import { observabilityKeys } from "../packages/observability/src/keys";
import { paymentsKeys } from "../packages/payments/src/keys";
import { type Vendor, vendors } from "./vendors";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// The wizard writes what this manifest says; the app validates what keys.ts
// says. Any gap between the two means scaffolded .env.local files silently
// miss (or invent) variables — the exact drift this suite exists to catch.
const schemaByVendor: Record<Vendor["id"], z.ZodObject<z.ZodRawShape>> = {
	clerk: authKeys,
	supabase: backendKeys,
	posthog: analyticsKeys,
	sentry: observabilityKeys,
	revenuecat: paymentsKeys,
};

describe("vendor manifest mirrors packages/*/src/keys.ts", () => {
	it("covers every vendor id exactly once", () => {
		expect(vendors.map((vendor) => vendor.id).sort()).toEqual(
			Object.keys(schemaByVendor).sort(),
		);
	});

	for (const vendor of vendors) {
		it(`${vendor.id}: manifest keys equal the ${vendor.id} schema keys`, () => {
			const manifestKeys = vendor.keys.map((key) => key.env).sort();
			const schemaKeys = Object.keys(schemaByVendor[vendor.id].shape).sort();

			expect(manifestKeys).toEqual(schemaKeys);
		});
	}
});

describe("vendor removal targets exist in the template", () => {
	const appManifest = JSON.parse(
		readFileSync(join(repoRoot, "apps", "mobile", "package.json"), "utf8"),
	) as { dependencies?: Record<string, string> };

	for (const vendor of vendors) {
		const removal = vendor.removal;
		if (!removal) {
			continue;
		}

		it(`${vendor.id}: removal package and app dependencies are real`, () => {
			expect(existsSync(join(repoRoot, "packages", removal.pkg))).toBe(true);
			for (const dependency of removal.appDependencies) {
				expect(
					appManifest.dependencies,
					`apps/mobile no longer depends on ${dependency} — update removal.appDependencies`,
				).toHaveProperty([dependency]);
			}
		});

		it(`${vendor.id}: removal-owned app files exist`, () => {
			for (const file of removal.appFiles ?? []) {
				expect(existsSync(join(repoRoot, file)), file).toBe(true);
			}
		});
	}
});
