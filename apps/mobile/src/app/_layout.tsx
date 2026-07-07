import "@/env";

import { AnalyticsProvider } from "@repo/analytics";
import { AuthProvider, useAuth } from "@repo/auth";
import { NavThemeProvider } from "@repo/design-system/nav-theme";
import { initObservability } from "@repo/observability";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { SessionProvider, useSession } from "@/lib/session";

initObservability();

// Declarative gating (amber pattern): route availability derives from
// session + Clerk auth state, not imperative redirects.
function RootNavigator() {
	const { onboarded } = useSession();
	const { isLoaded, isSignedIn } = useAuth();

	if (!isLoaded) {
		return null;
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Protected guard={!onboarded}>
				<Stack.Screen name="onboarding" />
			</Stack.Protected>
			<Stack.Protected guard={onboarded && !isSignedIn}>
				<Stack.Screen name="sign-in" />
			</Stack.Protected>
			<Stack.Protected guard={onboarded && Boolean(isSignedIn)}>
				<Stack.Screen name="(tabs)" />
			</Stack.Protected>
		</Stack>
	);
}

export default function RootLayout() {
	return (
		<NavThemeProvider>
			<StatusBar style="auto" />
			<AuthProvider>
				<AnalyticsProvider>
					<SessionProvider>
						<RootNavigator />
					</SessionProvider>
				</AnalyticsProvider>
			</AuthProvider>
		</NavThemeProvider>
	);
}
