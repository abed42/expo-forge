import * as Sentry from "@sentry/react-native";

export type InitObservabilityOptions = Omit<Sentry.ReactNativeOptions, "dsn">;

let hasInitializedObservability = false;
let hasLoggedMissingObservabilityDsn = false;

// Metro statically inlines process.env.EXPO_PUBLIC_* member expressions in client bundles.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

function logMissingObservabilityDsn(): void {
	if (hasLoggedMissingObservabilityDsn) {
		return;
	}

	console.info(
		"[@repo/observability] Sentry disabled because EXPO_PUBLIC_SENTRY_DSN is not set.",
	);
	hasLoggedMissingObservabilityDsn = true;
}

export function initObservability(
	options: InitObservabilityOptions = {},
): void {
	if (!sentryDsn) {
		logMissingObservabilityDsn();
		return;
	}

	if (hasInitializedObservability) {
		return;
	}

	// Expo SDK 57-validated pin; 8.x pending getsentry/sentry-react-native#6384.
	Sentry.init({
		dsn: sentryDsn,
		enableAutoSessionTracking: true,
		enableNativeFramesTracking: true,
		attachStacktrace: true,
		...options,
	});

	hasInitializedObservability = true;
}

export { Sentry };
