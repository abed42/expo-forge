import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockTokenCache = vi.hoisted(() => ({
	getToken: vi.fn(),
	saveToken: vi.fn(),
}));

vi.mock("@clerk/expo", () => ({
	// Passthrough component — the tests inspect the element AuthProvider
	// returns, so the mock never actually renders.
	ClerkProvider: vi.fn(() => null),
	useAuth: vi.fn(),
	useUser: vi.fn(),
}));

vi.mock("@clerk/expo/token-cache", () => ({
	tokenCache: mockTokenCache,
}));

import { ClerkProvider } from "@clerk/expo";
import { AuthProvider } from "./provider";

const PUBLISHABLE_KEY = "pk_test_dW5pdC10ZXN0";

type InspectedProps = {
	publishableKey?: string;
	tokenCache?: unknown;
	children?: unknown;
};

describe("AuthProvider", () => {
	beforeEach(() => {
		vi.stubEnv("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("throws when EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is unset", () => {
		vi.stubEnv("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", undefined);

		expect(() => AuthProvider({ children: null })).toThrowError(
			/EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY/,
		);
	});

	it("renders ClerkProvider with the publishable key and token cache", () => {
		const element = AuthProvider({
			children: null,
		}) as ReactElement<InspectedProps>;

		expect(element.type).toBe(ClerkProvider);
		expect(element.props.publishableKey).toBe(PUBLISHABLE_KEY);
		expect(element.props.tokenCache).toBe(mockTokenCache);
	});

	it("forwards children through to ClerkProvider", () => {
		const element = AuthProvider({
			children: "app-content",
		}) as ReactElement<InspectedProps>;

		expect(element.props.children).toBe("app-content");
	});
});
