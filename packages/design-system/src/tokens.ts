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

const lightColors = {
	ink: "#111111",
	surface: "#FFFFFF",
	secondary: "#8A8A8E",
	fill: "#F2F2F2",
	border: "rgba(0, 0, 0, 0.08)",
	onInk: "#FFFFFF",
} as const;

const darkColors = {
	ink: "#F5F5F5",
	surface: "#0B0B0B",
	secondary: lightColors.secondary,
	fill: "#1C1C1E",
	border: "rgba(255, 255, 255, 0.10)",
	onInk: lightColors.ink,
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
