import { PostHogProvider, usePostHog } from "posthog-react-native";
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
} from "react";

export type AnalyticsProperties = Record<string, unknown>;

export type AnalyticsClient = {
	capture: (eventName: string, properties?: AnalyticsProperties) => void;
	identify: (distinctId: string, userProperties?: AnalyticsProperties) => void;
	reset: () => void;
	screen: (screenName: string, properties?: AnalyticsProperties) => void;
};

export type AnalyticsProviderProps = {
	children: ReactNode;
};

const noopAnalyticsClient: AnalyticsClient = {
	capture: () => {},
	identify: () => {},
	reset: () => {},
	screen: () => {},
};

const AnalyticsContext = createContext<AnalyticsClient>(noopAnalyticsClient);

let hasLoggedMissingAnalyticsKey = false;

// Metro statically inlines process.env.EXPO_PUBLIC_* member expressions in client bundles.
const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;

function logMissingAnalyticsKey(): void {
	if (hasLoggedMissingAnalyticsKey) {
		return;
	}

	console.info(
		"[@repo/analytics] PostHog disabled because EXPO_PUBLIC_POSTHOG_KEY is not set.",
	);
	hasLoggedMissingAnalyticsKey = true;
}

function AnalyticsContextBridge(props: AnalyticsProviderProps): ReactElement {
	const posthog = usePostHog();

	// AnalyticsProperties is intentionally permissive (Record<string, unknown>) for callers, while PostHog
	// constrains values to JSON-serializable types. We cast at this single boundary and rely on callers
	// passing serializable data — the same contract PostHog enforces at runtime.
	const analyticsClient: AnalyticsClient = {
		capture: (eventName, properties) => {
			posthog.capture(
				eventName,
				properties as Parameters<typeof posthog.capture>[1],
			);
		},
		identify: (distinctId, userProperties) => {
			posthog.identify(
				distinctId,
				userProperties as Parameters<typeof posthog.identify>[1],
			);
		},
		reset: () => {
			posthog.reset();
		},
		screen: (screenName, properties) => {
			posthog.screen(
				screenName,
				properties as Parameters<typeof posthog.screen>[1],
			);
		},
	};

	return (
		<AnalyticsContext.Provider value={analyticsClient}>
			{props.children}
		</AnalyticsContext.Provider>
	);
}

export function AnalyticsProvider(props: AnalyticsProviderProps): ReactElement {
	if (!posthogKey) {
		logMissingAnalyticsKey();
		return <>{props.children}</>;
	}

	return (
		<PostHogProvider apiKey={posthogKey} options={{ host: posthogHost }}>
			<AnalyticsContextBridge>{props.children}</AnalyticsContextBridge>
		</PostHogProvider>
	);
}

export function useAnalytics(): AnalyticsClient {
	return useContext(AnalyticsContext);
}
