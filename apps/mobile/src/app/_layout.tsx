import { NavThemeProvider } from "@repo/design-system/nav-theme";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
	return (
		<NavThemeProvider>
			<StatusBar style="auto" />
			<Stack screenOptions={{ headerShown: false }} />
		</NavThemeProvider>
	);
}
