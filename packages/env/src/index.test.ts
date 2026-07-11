import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// composeEnv keeps a module-level cache, so every test re-imports a fresh
// copy of the module (vi.resetModules) instead of sharing cache state.
async function importComposeEnv() {
	const module = await import("./index");
	return module.composeEnv;
}

describe("composeEnv", () => {
	beforeEach(() => {
		vi.resetModules();

		vi.stubEnv("EXPO_PUBLIC_SKIP_ENV_VALIDATION", undefined);
		vi.stubEnv("EXPO_PUBLIC_ALPHA", undefined);
		vi.stubEnv("EXPO_PUBLIC_BETA", undefined);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("merges multiple schemas and parses a valid environment", async () => {
		vi.stubEnv("EXPO_PUBLIC_ALPHA", "https://alpha.example.com");
		vi.stubEnv("EXPO_PUBLIC_BETA", "beta-value");

		const composeEnv = await importComposeEnv();
		const env = composeEnv(
			z.object({ EXPO_PUBLIC_ALPHA: z.url() }),
			z.object({ EXPO_PUBLIC_BETA: z.string().min(1) }),
		);

		expect(env.EXPO_PUBLIC_ALPHA).toBe("https://alpha.example.com");
		expect(env.EXPO_PUBLIC_BETA).toBe("beta-value");
	});

	it("returns only schema-declared keys, not the whole process.env", async () => {
		vi.stubEnv("EXPO_PUBLIC_ALPHA", "alpha-value");

		const composeEnv = await importComposeEnv();
		const env = composeEnv(z.object({ EXPO_PUBLIC_ALPHA: z.string() }));

		expect(Object.keys(env)).toEqual(["EXPO_PUBLIC_ALPHA"]);
	});

	it("throws with a prettified message naming the invalid variable", async () => {
		vi.stubEnv("EXPO_PUBLIC_ALPHA", "not-a-url");

		const composeEnv = await importComposeEnv();

		expect(() =>
			composeEnv(z.object({ EXPO_PUBLIC_ALPHA: z.url() })),
		).toThrowError(
			expect.objectContaining({
				message: expect.stringMatching(
					/Invalid environment variables:[\s\S]*EXPO_PUBLIC_ALPHA/,
				),
			}),
		);
	});

	it("throws when a required variable is missing entirely", async () => {
		const composeEnv = await importComposeEnv();

		expect(() =>
			composeEnv(z.object({ EXPO_PUBLIC_ALPHA: z.string().min(1) })),
		).toThrowError(/EXPO_PUBLIC_ALPHA/);
	});

	it("bypasses validation when EXPO_PUBLIC_SKIP_ENV_VALIDATION is true", async () => {
		vi.stubEnv("EXPO_PUBLIC_SKIP_ENV_VALIDATION", "true");

		const composeEnv = await importComposeEnv();
		const env = composeEnv(z.object({ EXPO_PUBLIC_ALPHA: z.url() }));

		// No throw despite the missing/invalid variable, and the raw env object
		// is handed back as-is.
		expect(env).toBe(process.env);
	});

	it("caches the parsed result across calls with the same schemas", async () => {
		vi.stubEnv("EXPO_PUBLIC_ALPHA", "alpha-value");

		const composeEnv = await importComposeEnv();
		const schema = z.object({ EXPO_PUBLIC_ALPHA: z.string() });

		const first = composeEnv(schema);
		// A later env mutation must not leak into the cached result.
		vi.stubEnv("EXPO_PUBLIC_ALPHA", "changed-after-first-call");
		const second = composeEnv(schema);

		expect(second).toBe(first);
		expect(second.EXPO_PUBLIC_ALPHA).toBe("alpha-value");
	});

	it("validates each distinct schema composition independently", async () => {
		// Regression: the cache used to be a single module-global slot, so the
		// second composeEnv call with DIFFERENT schemas silently returned the
		// first call's result without validating its own variables.
		vi.stubEnv("EXPO_PUBLIC_ALPHA", "alpha-value");

		const composeEnv = await importComposeEnv();

		const alpha = composeEnv(z.object({ EXPO_PUBLIC_ALPHA: z.string() }));
		expect(alpha.EXPO_PUBLIC_ALPHA).toBe("alpha-value");

		// EXPO_PUBLIC_BETA is unset — a different composition must fail loud
		// instead of inheriting alpha's cached result.
		expect(() =>
			composeEnv(z.object({ EXPO_PUBLIC_BETA: z.string().min(1) })),
		).toThrowError(/EXPO_PUBLIC_BETA/);
	});

	it('treats "" as unset — blank KEY= lines must not fail optional validators', async () => {
		// dotenv yields "" for a blank `KEY=` line; .env.example ships those and
		// the init wizard writes them for skipped keys. Regression: z.url()
		// .optional() rejected "" and crashed boot for keys the user never set.
		vi.stubEnv("EXPO_PUBLIC_ALPHA", "");

		const composeEnv = await importComposeEnv();
		const env = composeEnv(z.object({ EXPO_PUBLIC_ALPHA: z.url().optional() }));

		expect(env.EXPO_PUBLIC_ALPHA).toBeUndefined();
	});

	it('treats "" on a required variable as missing, not invalid', async () => {
		vi.stubEnv("EXPO_PUBLIC_ALPHA", "");

		const composeEnv = await importComposeEnv();

		expect(() =>
			composeEnv(z.object({ EXPO_PUBLIC_ALPHA: z.string().min(1) })),
		).toThrowError(/EXPO_PUBLIC_ALPHA/);
	});

	it("gives later schemas precedence when keys overlap", async () => {
		vi.stubEnv("EXPO_PUBLIC_ALPHA", "abc");

		const composeEnv = await importComposeEnv();
		const env = composeEnv(
			z.object({ EXPO_PUBLIC_ALPHA: z.url() }),
			// Later schema overrides the earlier validator for the same key.
			z.object({ EXPO_PUBLIC_ALPHA: z.string().min(1) }),
		);

		expect(env.EXPO_PUBLIC_ALPHA).toBe("abc");
	});
});
