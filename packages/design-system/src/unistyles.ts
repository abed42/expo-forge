import { StyleSheet } from "react-native-unistyles";

import { darkTheme, lightTheme } from "./tokens";

const appThemes = {
	light: lightTheme,
	dark: darkTheme,
} as const;

const breakpoints = {
	xs: 0,
	sm: 300,
	md: 500,
	lg: 800,
	xl: 1200,
} as const;

type AppThemes = typeof appThemes;
type AppBreakpoints = typeof breakpoints;

declare module "react-native-unistyles" {
	export interface UnistylesThemes extends AppThemes {}
	export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
	themes: appThemes,
	breakpoints,
	settings: {
		adaptiveThemes: true,
	},
});

export { appThemes, breakpoints };
