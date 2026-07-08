import { describe, expect, it } from "vitest";

import { authKeys } from "./keys";

describe("authKeys", () => {
	it("accepts a pk_-prefixed publishable key", () => {
		const result = authKeys.safeParse({
			EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_dW5pdC10ZXN0",
		});

		expect(result.success).toBe(true);
		expect(result.data?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe(
			"pk_test_dW5pdC10ZXN0",
		);
	});

	it("rejects a secret key (sk_ prefix)", () => {
		const result = authKeys.safeParse({
			EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "sk_test_dW5pdC10ZXN0",
		});

		expect(result.success).toBe(false);
	});

	it("rejects garbage values", () => {
		for (const value of ["", "not-a-key", 42, null]) {
			const result = authKeys.safeParse({
				EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: value,
			});

			expect(result.success).toBe(false);
		}
	});

	it("rejects an env with the key missing", () => {
		const result = authKeys.safeParse({});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual([
			"EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
		]);
	});
});
