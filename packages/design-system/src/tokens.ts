const shared = {
	gap: (value: number) => value * 8,
	radius: {
		pill: 999,
		card: 12,
	},
	type: {
		// CUSTOM FONT SLOT: swap system font here when a display face is added (see ISA anti-criterion — system fonts only in Phase 0)
		largeTitle: {
			fontSize: 34,
			lineHeight: 41,
			fontWeight: "700",
			letterSpacing: -0.6,
		},
		title: {
			fontSize: 24,
			lineHeight: 30,
			fontWeight: "700",
			letterSpacing: -0.3,
		},
		body: {
			fontSize: 17,
			lineHeight: 24,
			fontWeight: "400",
		},
		caption: {
			fontSize: 13,
			lineHeight: 18,
			fontWeight: "500",
			letterSpacing: 0.2,
		},
	},
} as const;

// Neutral scale from the brand theme (oklch base-* converted to sRGB hex);
// accent is the brand vermilion scale (oklch accent-*).
const lightColors = {
	ink: "#0A0A0A",
	surface: "#FFFFFF",
	secondary: "#737373",
	fill: "#F5F5F5",
	border: "rgba(0, 0, 0, 0.08)",
	onInk: "#FFFFFF",
	accent: "#D63201",
	accentSoft: "#FFEBE5",
	onAccentSoft: "#9E2500",
} as const;

const darkColors = {
	ink: "#F5F5F5",
	surface: "#0A0A0A",
	secondary: "#A1A1A1",
	fill: "#262626",
	border: "rgba(255, 255, 255, 0.10)",
	onInk: "#0A0A0A",
	accent: "#FF6A3D",
	accentSoft: "#330C00",
	onAccentSoft: "#FF8E6B",
} as const;

export const lightTheme = {
	...shared,
	colors: lightColors,
} as const;

export const darkTheme = {
	...shared,
	colors: darkColors,
} as const;

export const tokens = {
	light: lightTheme,
	dark: darkTheme,
	gap: shared.gap,
	radius: shared.radius,
	type: shared.type,
} as const;

export type AppTheme = typeof lightTheme;
export type AppThemes = {
	light: typeof lightTheme;
	dark: typeof darkTheme;
};
export type AppThemeName = keyof AppThemes;
