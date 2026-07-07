import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import * as SecureStore from "expo-secure-store";
import type { ComponentProps, ReactElement } from "react";

export type AuthProviderProps = Omit<
	ComponentProps<typeof ClerkProvider>,
	"publishableKey" | "tokenCache"
>;

const tokenCache = {
	async getToken(key: string): Promise<string | null> {
		try {
			return await SecureStore.getItemAsync(key);
		} catch {
			try {
				await SecureStore.deleteItemAsync(key);
			} catch {
				// If cleanup fails, we still return null so Clerk treats the session as missing.
			}

			// A failed SecureStore read means the cached token is not trustworthy, so we clear it and sign out locally.
			return null;
		}
	},
	async saveToken(key: string, value: string): Promise<void> {
		try {
			await SecureStore.setItemAsync(key, value);
		} catch {
			// A failed SecureStore write should not block Clerk state updates; a later token refresh can retry persistence.
		}
	},
};

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
