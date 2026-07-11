import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IconButton as IconButtonComponent } from "./icon-button";

// The gate under test: `canUseGlass` is computed once at module load from
// isLiquidGlassAvailable(), so each case re-imports a fresh module copy with
// the mock primed to the platform capability being simulated.
const glassMock = vi.hoisted(() => ({
	available: false,
}));

vi.mock("expo-glass-effect", () => ({
	GlassView: (props: Record<string, unknown>) => props,
	isLiquidGlassAvailable: () => glassMock.available,
}));

vi.mock("react-native", () => ({
	Pressable: (props: Record<string, unknown>) => props,
}));

const fakeTheme = {
	colors: { fill: "#F5F5F5" },
};

vi.mock("react-native-unistyles", () => ({
	StyleSheet: {
		create: (styles: unknown) =>
			typeof styles === "function" ? styles(fakeTheme) : styles,
	},
}));

async function loadIconButton(available: boolean) {
	glassMock.available = available;
	vi.resetModules();
	const module = await import("./icon-button");
	return module.IconButton;
}

type PressableProps = {
	accessibilityLabel: string;
	accessibilityRole: string;
	style: (state: { pressed: boolean }) => unknown[];
	children: ReactElement | string;
};

// IconButton is hook-free, so invoking it directly yields the element tree.
function render(
	IconButton: typeof IconButtonComponent,
	props: Partial<Parameters<typeof IconButtonComponent>[0]> = {},
) {
	const element = IconButton({
		accessibilityLabel: "Back",
		children: "icon",
		...props,
	}) as ReactElement<PressableProps>;
	return element.props;
}

describe("IconButton glass gating", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("wraps children in GlassView when glass is requested and available", async () => {
		const IconButton = await loadIconButton(true);
		const pressable = render(IconButton, { glass: true });

		const child = pressable.children as ReactElement<{
			glassEffectStyle: string;
		}>;
		expect(child.props.glassEffectStyle).toBe("regular");
		// The host must not paint under the glass — fill would read as a wash.
		expect(pressable.style({ pressed: false })).toContainEqual(
			expect.objectContaining({ backgroundColor: "transparent" }),
		);
	});

	it("falls back to plain fill when the glass API is unavailable", async () => {
		const IconButton = await loadIconButton(false);
		const pressable = render(IconButton, { glass: true });

		// Children render directly — no GlassView anywhere in the tree.
		expect(pressable.children).toBe("icon");
		expect(pressable.style({ pressed: false })).toContainEqual(
			expect.objectContaining({ backgroundColor: fakeTheme.colors.fill }),
		);
	});

	it("never renders glass when the caller did not ask for it", async () => {
		const IconButton = await loadIconButton(true);
		const pressable = render(IconButton);

		expect(pressable.children).toBe("icon");
	});

	it("keeps the accessibility contract", async () => {
		const IconButton = await loadIconButton(false);
		const pressable = render(IconButton);

		expect(pressable.accessibilityLabel).toBe("Back");
		expect(pressable.accessibilityRole).toBe("button");
		expect(pressable.style({ pressed: true })).toContainEqual(
			expect.objectContaining({ opacity: 0.72 }),
		);
	});
});
