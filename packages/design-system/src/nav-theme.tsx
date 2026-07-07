import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SystemUI from "expo-system-ui";
import { type ReactNode, useEffect } from "react";
import { useColorScheme } from "react-native";
import { useUnistyles } from "react-native-unistyles";

export function NavThemeProvider({ children }: { children: ReactNode }) {
	const scheme = useColorScheme();
	const { theme } = useUnistyles();
	const base = scheme === "dark" ? DarkTheme : DefaultTheme;
	const navTheme = {
		...base,
		colors: {
			...base.colors,
			background: theme.colors.surface,
			card: theme.colors.surface,
			text: theme.colors.ink,
			border: theme.colors.border,
			primary: theme.colors.ink,
		},
	};

	useEffect(() => {
		SystemUI.setBackgroundColorAsync(theme.colors.surface);
	}, [theme.colors.surface]);

	return <ThemeProvider value={navTheme}>{children}</ThemeProvider>;
}
