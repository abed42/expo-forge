import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
// Official cache (SecureStore-backed) per the Expo quickstart — replaces the
// previous hand-rolled implementation.
import { tokenCache } from "@clerk/expo/token-cache";
import type { ComponentProps, ReactElement } from "react";

export type AuthProviderProps = Omit<
	ComponentProps<typeof ClerkProvider>,
	"publishableKey" | "tokenCache"
>;

export function AuthProvider(props: AuthProviderProps): ReactElement {
	// `@clerk/expo` is the current Expo SDK package; the deprecated `@clerk/clerk-expo` package must not be used.
	// Metro statically inlines process.env.EXPO_PUBLIC_* member expressions in client bundles.
	const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

	if (!publishableKey) {
		throw new Error(
			"[@repo/auth] Missing required environment variable EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.",
		);
	}

	return (
		<ClerkProvider
			{...props}
			publishableKey={publishableKey}
			tokenCache={tokenCache}
		/>
	);
}

export { useAuth, useUser };
