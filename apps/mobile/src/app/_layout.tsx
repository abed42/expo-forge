import "@/env";

import { AnalyticsProvider } from "@repo/analytics";
import { AuthProvider, useAuth } from "@repo/auth";
import { NavThemeProvider } from "@repo/design-system/nav-theme";
import { initObservability } from "@repo/observability";
import { configurePayments } from "@repo/payments";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useUnistyles } from "react-native-unistyles";

import { UpdateBanner } from "@/components/update-banner";
import { applyAppearance, loadAppearance } from "@/lib/appearance";

initObservability();
configurePayments();

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
				{/* Declared inside the guard so session activation evicts it —
				    otherwise it's auto-registered unguarded and the user stays
				    on it after a successful OTP verify. */}
				<Stack.Screen name="sign-in" />
			</Stack.Protected>
			<Stack.Protected guard={Boolean(isSignedIn)}>
				<Stack.Screen name="(tabs)" />
				{/* Declared inside the guard so session activation owns them —
				    otherwise Expo Router auto-registers unguarded routes and
				    users can land on search/detail after sign-out. */}
				<Stack.Screen name="search" options={{ animation: "fade" }} />
				<Stack.Screen name="item/[id]" />
				<Stack.Screen name="paywall" />
				<Stack.Screen
					name="showcase-sheet"
					options={{
						// Transparent native header so Stack.Toolbar items can render
						// inside the sheet (flightly pattern).
						headerShadowVisible: false,
						headerShown: true,
						headerTransparent: true,
						presentation: "formSheet",
						sheetAllowedDetents: [0.6, 1.0],
						sheetGrabberVisible: true,
						sheetInitialDetentIndex: 0,
						title: "",
					}}
				/>
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
			{/* Renders null in dev — @repo/updates is guarded behind __DEV__. */}
			<UpdateBanner />
		</NavThemeProvider>
	);
}
