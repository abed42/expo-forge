import "@/env";

import { AnalyticsProvider } from "@repo/analytics";
import { AuthProvider, useAuth } from "@repo/auth";
import { NavThemeProvider } from "@repo/design-system/nav-theme";
import { initObservability } from "@repo/observability";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useUnistyles } from "react-native-unistyles";

import { applyAppearance, loadAppearance } from "@/lib/appearance";

initObservability();

// Declarative gating (amber pattern): the welcome screen doubles as auth
// entry, so the only session state is Clerk's. Email flow is a push within
// the unauthenticated group.
function RootNavigator() {
	const { isLoaded, isSignedIn } = useAuth();

	if (!isLoaded) {
		return null;
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Protected guard={!isSignedIn}>
				<Stack.Screen name="onboarding" />
			</Stack.Protected>
			<Stack.Protected guard={Boolean(isSignedIn)}>
				<Stack.Screen name="(tabs)" />
			</Stack.Protected>
		</Stack>
	);
}

export default function RootLayout() {
	const { rt } = useUnistyles();

	useEffect(() => {
		loadAppearance().then(applyAppearance);
	}, []);

	return (
		<NavThemeProvider>
			<StatusBar style={rt.themeName === "dark" ? "light" : "dark"} />
			<AuthProvider>
				<AnalyticsProvider>
					<RootNavigator />
				</AnalyticsProvider>
			</AuthProvider>
		</NavThemeProvider>
	);
}
