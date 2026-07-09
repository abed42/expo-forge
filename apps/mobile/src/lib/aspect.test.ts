import { describe, expect, it } from "vitest";

import { aspectFor } from "./aspect";

describe("aspectFor", () => {
	it("returns a positive ratio for numeric keys", () => {
		expect(aspectFor(0)).toBeGreaterThan(0);
		expect(aspectFor(5)).toBeGreaterThan(0);
	});

	it("is stable for the same string key", () => {
		expect(aspectFor("abc")).toBe(aspectFor("abc"));
	});

	it("varies across different keys", () => {
		const values = new Set(
			["a", "b", "c", "d", "e", "f"].map((key) => aspectFor(key)),
		);
		expect(values.size).toBeGreaterThan(1);
	});
});
