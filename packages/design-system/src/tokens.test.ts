import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme, tokens } from "./tokens";

// Every component styles against `theme.colors.X` for whichever theme is
// active — a key present in one theme but not the other renders as
// `undefined` (invisible/black) only in that mode, which no type error
// catches because the themes are independent `as const` objects.
describe("theme parity", () => {
	it("light and dark expose the identical color key set", () => {
		expect(Object.keys(darkTheme.colors).sort()).toEqual(
			Object.keys(lightTheme.colors).sort(),
		);
	});

	it("shares gap, radius, and type scales across themes by identity", () => {
		expect(darkTheme.gap).toBe(lightTheme.gap);
		expect(darkTheme.radius).toBe(lightTheme.radius);
		expect(darkTheme.type).toBe(lightTheme.type);
	});

	it("keeps ink/surface polarity flipped between themes", () => {
		// Dark ink is deliberately off-white (#F5F5F5, not #FFF), so the themes
		// are not strict mirrors — the contract is contrast, not symmetry.
		expect(lightTheme.colors.ink).not.toBe(lightTheme.colors.surface);
		expect(darkTheme.colors.ink).not.toBe(darkTheme.colors.surface);
		// The shared near-black anchors light ink and dark surface alike.
		expect(lightTheme.colors.ink).toBe(darkTheme.colors.surface);
		// onInk must read against an ink-filled pill, i.e. equal the surface.
		expect(lightTheme.colors.onInk).toBe(lightTheme.colors.surface);
		expect(darkTheme.colors.onInk).toBe(darkTheme.colors.surface);
	});
});

describe("tokens", () => {
	it("gap() is the 8pt grid", () => {
		expect(tokens.gap(1)).toBe(8);
		expect(tokens.gap(2.5)).toBe(20);
		expect(tokens.gap(0)).toBe(0);
	});

	it("exposes both themes under their unistyles names", () => {
		expect(tokens.light).toBe(lightTheme);
		expect(tokens.dark).toBe(darkTheme);
	});

	it("every type-scale entry has a fontSize/lineHeight pair with room to breathe", () => {
		for (const [name, style] of Object.entries(tokens.type)) {
			expect(style.fontSize, name).toBeGreaterThan(0);
			expect(style.lineHeight, name).toBeGreaterThanOrEqual(style.fontSize);
		}
	});
});
