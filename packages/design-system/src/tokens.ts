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

// The chat surface is fixed-dark in both themes — it's a port of the ChatGPT
// composer + attachment sheet (react-native-motion "chatgpt-attachments"),
// and every value here was sampled off that reference. The glass material
// takes its colour from the dark keyboard beneath it, so a light variant
// would need re-measuring, not re-tinting.
// chat: used only by `apps/mobile/src/components/chat` — delete this block
// (and the two `chat:` entries below) with it.
const chatColors = {
	background: "#000000",
	/** Composer + keyboard surface, sampled at rgb(29,29,29). */
	surface: "#1D1D1D",
	placeholder: "#777777",
	text: "#FFFFFF",
	/** iOS system blue on the un-tinted pixels. */
	accent: "#007AFF",
	/** The "Add N photos" pill, sampled as a whole. */
	accentGlass: "#056DE7",
	/** Darkening the glass controls apply to whatever they sit on. */
	controlScrim: "rgba(0, 0, 0, 0.31)",
	/** Round icon wells inside the attachment menu. */
	iconWell: "rgba(255, 255, 255, 0.09)",
	/** Laid over the panel's blur to land on the reference's rgb(30,30,30). */
	material: "rgba(255, 255, 255, 0.047)",
	/** The same material as an opaque fill, where there is no blur under it. */
	materialFlat: "#1E1E1E",
	/** Behind a photo for the frames before it decodes. */
	photoFill: "#141414",
	/** Bullet beside each suggestion row. */
	suggestionDot: "rgba(255, 255, 255, 0.16)",
	/** Scrim behind the ✕ on an attachment thumbnail. */
	removeScrim: "rgba(0, 0, 0, 0.45)",
	/** Hairline under the assistant's rows in the thread. */
	border: "rgba(255, 255, 255, 0.08)",
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
	danger: "#B3261E",
	chat: chatColors,
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
	danger: "#F2B8B5",
	chat: chatColors,
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
