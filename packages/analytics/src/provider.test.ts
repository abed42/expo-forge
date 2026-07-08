import { Fragment, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsKeys } from "./keys";
import type { AnalyticsClient, AnalyticsProviderProps } from "./provider";

const posthogClientMock = vi.hoisted(() => ({
	capture: vi.fn(),
	identify: vi.fn(),
	reset: vi.fn(),
	screen: vi.fn(),
}));

vi.mock("posthog-react-native", () => ({
	PostHogProvider: vi.fn(() => null),
	usePostHog: vi.fn(() => posthogClientMock),
}));

type ProviderElementProps = {
	children?: ReactNode;
	apiKey?: string;
	options?: { host?: string };
};

type BridgeElement = ReactElement<AnalyticsProviderProps> & {
	type: (
		props: AnalyticsProviderProps,
	) => ReactElement<{ value: AnalyticsClient; children?: ReactNode }>;
};

async function loadProvider(): Promise<typeof import("./provider")> {
	return await import("./provider");
}

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
	delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
	vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("analyticsKeys", () => {
	it("accepts a valid PostHog key and host", () => {
		const result = analyticsKeys.safeParse({
			EXPO_PUBLIC_POSTHOG_KEY: "phc_abc123",
			EXPO_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
		});

		expect(result.success).toBe(true);
	});

	it("accepts an empty env because both keys are optional", () => {
		expect(analyticsKeys.safeParse({}).success).toBe(true);
	});

	it("rejects a key without the phc_ prefix", () => {
		const result = analyticsKeys.safeParse({
			EXPO_PUBLIC_POSTHOG_KEY: "abc123",
		});

		expect(result.success).toBe(false);
	});

	it("rejects a host that is not a URL", () => {
		const result = analyticsKeys.safeParse({
			EXPO_PUBLIC_POSTHOG_KEY: "phc_abc123",
			EXPO_PUBLIC_POSTHOG_HOST: "not-a-url",
		});

		expect(result.success).toBe(false);
	});

	it("rejects a non-string key", () => {
		const result = analyticsKeys.safeParse({
			EXPO_PUBLIC_POSTHOG_KEY: 123,
		});

		expect(result.success).toBe(false);
	});
});

describe("AnalyticsProvider without EXPO_PUBLIC_POSTHOG_KEY", () => {
	it("renders children bare inside a Fragment and skips PostHog", async () => {
		const { AnalyticsProvider } = await loadProvider();
		const posthog = await import("posthog-react-native");
		const children = "child-content";

		const element = AnalyticsProvider({
			children,
		}) as ReactElement<ProviderElementProps>;

		expect(element.type).toBe(Fragment);
		expect(element.props.children).toBe(children);
		expect(posthog.PostHogProvider).not.toHaveBeenCalled();
	});

	it("logs a single console.info even when rendered repeatedly", async () => {
		const { AnalyticsProvider } = await loadProvider();

		AnalyticsProvider({ children: null });
		AnalyticsProvider({ children: null });

		expect(console.info).toHaveBeenCalledTimes(1);
		expect(console.info).toHaveBeenCalledWith(
			expect.stringContaining("EXPO_PUBLIC_POSTHOG_KEY"),
		);
	});
});

describe("AnalyticsProvider with EXPO_PUBLIC_POSTHOG_KEY", () => {
	it("renders PostHogProvider with the api key and host from env", async () => {
		process.env.EXPO_PUBLIC_POSTHOG_KEY = "phc_test_key";
		process.env.EXPO_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
		const { AnalyticsProvider } = await loadProvider();
		const posthog = await import("posthog-react-native");
		const children = "child-content";

		const element = AnalyticsProvider({
			children,
		}) as ReactElement<ProviderElementProps>;

		expect(element.type).toBe(posthog.PostHogProvider);
		expect(element.props.apiKey).toBe("phc_test_key");
		expect(element.props.options).toEqual({
			host: "https://eu.i.posthog.com",
		});
		expect(console.info).not.toHaveBeenCalled();
	});

	it("bridges the analytics client to the PostHog instance", async () => {
		process.env.EXPO_PUBLIC_POSTHOG_KEY = "phc_test_key";
		const { AnalyticsProvider } = await loadProvider();
		const children = "child-content";

		const element = AnalyticsProvider({
			children,
		}) as ReactElement<ProviderElementProps>;
		const bridge = element.props.children as BridgeElement;
		const rendered = bridge.type(bridge.props);
		const client = rendered.props.value;

		expect(rendered.props.children).toBe(children);

		client.capture("checkout_started", { plan: "pro" });
		expect(posthogClientMock.capture).toHaveBeenCalledWith("checkout_started", {
			plan: "pro",
		});

		client.identify("user-1", { email: "user@example.com" });
		expect(posthogClientMock.identify).toHaveBeenCalledWith("user-1", {
			email: "user@example.com",
		});

		client.screen("Home", { tab: "feed" });
		expect(posthogClientMock.screen).toHaveBeenCalledWith("Home", {
			tab: "feed",
		});

		client.reset();
		expect(posthogClientMock.reset).toHaveBeenCalledTimes(1);
	});
});
