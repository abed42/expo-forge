import { NavThemeProvider } from "@repo/design-system/nav-theme";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { SessionProvider, useSession } from "@/lib/session";

// Declarative gating (amber pattern): route availability is derived from
// session state, not imperative redirects. When @repo/auth lands, signedIn
// comes from Clerk's isSignedIn.
function RootNavigator() {
	const { onboarded, signedIn } = useSession();

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Protected guard={!onboarded}>
				<Stack.Screen name="onboarding" />
			</Stack.Protected>
			<Stack.Protected guard={onboarded && !signedIn}>
				<Stack.Screen name="sign-in" />
			</Stack.Protected>
			<Stack.Protected guard={onboarded && signedIn}>
				<Stack.Screen name="(tabs)" />
			</Stack.Protected>
		</Stack>
	);
}

export default function RootLayout() {
	return (
		<NavThemeProvider>
			<StatusBar style="auto" />
			<SessionProvider>
				<RootNavigator />
			</SessionProvider>
		</NavThemeProvider>
	);
}
