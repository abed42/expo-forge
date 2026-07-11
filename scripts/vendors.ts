// Vendor manifest — the single source of truth the init wizard iterates.
// Mirrors packages/*/src/keys.ts (the Zod schemas the app validates at boot);
// when a package's keys.ts changes, update the matching entry here.
// Drift is caught by scripts/vendors.test.ts, which diffs every vendor's
// key list against its package schema — run `bun run test:scripts`.

export type VendorKeySpec = {
	/** EXPO_PUBLIC_* variable written to apps/mobile/.env.local */
	env: string;
	label: string;
	placeholder: string;
	/** Returns an error message for invalid input, undefined when valid. */
	validate: (value: string) => string | undefined;
};

export type RemovablePackage = "analytics" | "observability" | "payments";

export type VendorRemoval = {
	/** packages/<pkg> workspace deleted on "Remove". */
	pkg: RemovablePackage;
	/** Native/runtime dependencies removed from apps/mobile with the wrapper. */
	appDependencies: readonly string[];
	/** App files owned entirely by the optional vendor. */
	appFiles?: readonly string[];
};

export type Vendor = {
	id: "clerk" | "supabase" | "posthog" | "sentry" | "revenuecat";
	name: string;
	/** Where to find the key — shown in prompts and .env.local comments. */
	hint: string;
	required: boolean;
	/** Optional vendors only: everything deleted on "Remove". */
	removal?: VendorRemoval;
	keys: VendorKeySpec[];
};

const httpsUrl = (value: string) =>
	/^https:\/\/.+/.test(value) ? undefined : "Must be an https:// URL";

const nonEmpty = (value: string) => (value.length > 0 ? undefined : "Required");

export const vendors: Vendor[] = [
	{
		id: "clerk",
		name: "Clerk",
		hint: "dashboard.clerk.com -> API Keys",
		required: true,
		keys: [
			{
				env: "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
				label: "Clerk publishable key",
				placeholder: "pk_test_...",
				validate: (value) =>
					/^pk_/.test(value) ? undefined : 'Must start with "pk_"',
			},
		],
	},
	{
		id: "supabase",
		name: "Supabase",
		hint: "supabase.com/dashboard -> Settings -> API Keys",
		required: true,
		keys: [
			{
				env: "EXPO_PUBLIC_SUPABASE_URL",
				label: "Supabase project URL",
				placeholder: "https://xyzcompany.supabase.co",
				validate: httpsUrl,
			},
			{
				env: "EXPO_PUBLIC_SUPABASE_KEY",
				label: "Supabase publishable key",
				placeholder: "sb_publishable_...",
				validate: nonEmpty,
			},
		],
	},
	{
		id: "posthog",
		name: "PostHog",
		hint: "posthog.com -> Project Settings -> API Key",
		required: false,
		removal: {
			pkg: "analytics",
			appDependencies: ["posthog-react-native"],
		},
		keys: [
			{
				env: "EXPO_PUBLIC_POSTHOG_KEY",
				label: "PostHog project API key",
				placeholder: "phc_...",
				validate: (value) =>
					/^phc_/.test(value) ? undefined : 'Must start with "phc_"',
			},
			{
				env: "EXPO_PUBLIC_POSTHOG_HOST",
				label: "PostHog host (Enter to skip — US Cloud default)",
				placeholder: "https://us.i.posthog.com",
				validate: httpsUrl,
			},
		],
	},
	{
		id: "sentry",
		name: "Sentry",
		hint: "sentry.io -> Project Settings -> Client Keys (DSN)",
		required: false,
		removal: {
			pkg: "observability",
			appDependencies: ["@sentry/react-native"],
		},
		keys: [
			{
				env: "EXPO_PUBLIC_SENTRY_DSN",
				label: "Sentry DSN",
				placeholder: "https://...ingest.sentry.io/...",
				validate: httpsUrl,
			},
		],
	},
	{
		id: "revenuecat",
		name: "RevenueCat",
		hint: "app.revenuecat.com -> API Keys",
		required: false,
		removal: {
			pkg: "payments",
			appDependencies: ["react-native-purchases"],
			appFiles: ["apps/mobile/src/app/paywall.tsx"],
		},
		keys: [
			{
				env: "EXPO_PUBLIC_REVENUECAT_API_KEY",
				label: "RevenueCat public API key",
				placeholder: "appl_...",
				validate: nonEmpty,
			},
		],
	},
];

/**
 * Anchor-based source edits applied when an optional vendor is removed.
 * Each `find` string is the EXACT current content of the template file
 * (tab-indented). If the template drifts, the wizard warns and skips the
 * edit instead of corrupting the file.
 */
export type AnchorEdit = {
	/** Path relative to the scaffolded project root. */
	file: string;
	find: string;
	replace: string;
};

function removeAnchor(file: string, find: string): AnchorEdit {
	return { file, find, replace: "" };
}

// Split at the template placeholder so Biome does not interpret this exact
// source anchor as an accidental `${...}` inside a normal string.
const paymentRestoreAnchor = [
	'\tconst restorePurchases = async () => {\n\t\tif (restoring) {\n\t\t\treturn;\n\t\t}\n\t\tif (!paymentsReady) {\n\t\t\tAlert.alert(\n\t\t\t\t"Restore purchases",\n\t\t\t\t"RevenueCat isn\'t configured. Add EXPO_PUBLIC_REVENUECAT_API_KEY to apps/mobile/.env.local, or open Pro to see setup details.",\n\t\t\t\t[\n\t\t\t\t\t{ style: "cancel", text: "Not now" },\n\t\t\t\t\t{ onPress: () => router.push("/paywall"), text: "Open Pro" },\n\t\t\t\t],\n\t\t\t);\n\t\t\treturn;\n\t\t}\n\n\t\tsetRestoring(true);\n\t\ttry {\n\t\t\tconst result = await restore();\n\t\t\tif (!result) {\n\t\t\t\tAlert.alert("Restore purchases", "Could not reach RevenueCat.");\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tconst active = Object.keys(result.entitlements.active);\n\t\t\tAlert.alert(\n\t\t\t\t"Restored",\n\t\t\t\tactive.length > 0\n\t\t\t\t\t? `Active: $',
	'{active.join(", ")}`\n\t\t\t\t\t: "No active entitlements found for this Apple/Google account.",\n\t\t\t);\n\t\t} catch (error) {\n\t\t\tif (!isUserCancelled(error)) {\n\t\t\t\tAlert.alert(\n\t\t\t\t\t"Restore failed",\n\t\t\t\t\t(error as { message?: string })?.message ??\n\t\t\t\t\t\t"Could not restore purchases.",\n\t\t\t\t);\n\t\t\t}\n\t\t} finally {\n\t\t\tsetRestoring(false);\n\t\t}\n\t};\n\n',
].join("");

export const removalEdits: Record<RemovablePackage, AnchorEdit[]> = {
	analytics: [
		removeAnchor(
			"apps/mobile/src/env.ts",
			'import { analyticsKeys } from "@repo/analytics";\n',
		),
		removeAnchor("apps/mobile/src/env.ts", "\tanalyticsKeys,\n"),
		removeAnchor(
			"apps/mobile/src/app/_layout.tsx",
			'import { AnalyticsProvider } from "@repo/analytics";\n',
		),
		{
			file: "apps/mobile/src/app/_layout.tsx",
			find: "\t\t\t\t<AnalyticsProvider>\n\t\t\t\t\t<RootNavigator />\n\t\t\t\t</AnalyticsProvider>\n",
			replace: "\t\t\t\t<RootNavigator />\n",
		},
	],
	observability: [
		removeAnchor(
			"apps/mobile/src/env.ts",
			'import { observabilityKeys } from "@repo/observability";\n',
		),
		removeAnchor("apps/mobile/src/env.ts", "\tobservabilityKeys,\n"),
		removeAnchor(
			"apps/mobile/src/app/_layout.tsx",
			'import { initObservability } from "@repo/observability";\n',
		),
		removeAnchor("apps/mobile/src/app/_layout.tsx", "initObservability();\n"),
	],
	// @repo/payments is wired into env composition + boot configurePayments —
	// strip those anchors when the vendor is removed.
	payments: [
		removeAnchor(
			"apps/mobile/src/env.ts",
			'import { paymentsKeys } from "@repo/payments";\n',
		),
		removeAnchor("apps/mobile/src/env.ts", "\tpaymentsKeys,\n"),
		removeAnchor(
			"apps/mobile/src/app/_layout.tsx",
			'import { configurePayments } from "@repo/payments";\n',
		),
		removeAnchor("apps/mobile/src/app/_layout.tsx", "configurePayments();\n\n"),
		removeAnchor(
			"apps/mobile/src/app/_layout.tsx",
			'\t\t\t\t<Stack.Screen name="paywall" />\n',
		),
		removeAnchor(
			"apps/mobile/src/app/(tabs)/profile.tsx",
			'import { isPaymentsConfigured, usePaywall } from "@repo/payments";\n',
		),
		removeAnchor(
			"apps/mobile/src/app/(tabs)/profile.tsx",
			'function isUserCancelled(error: unknown): boolean {\n\tif ((error as { userCancelled?: boolean })?.userCancelled === true) {\n\t\treturn true;\n\t}\n\treturn /cancel/i.test(String((error as { message?: string })?.message ?? ""));\n}\n\n',
		),
		removeAnchor(
			"apps/mobile/src/app/(tabs)/profile.tsx",
			"\tconst { restore } = usePaywall();\n\tconst paymentsReady = isPaymentsConfigured();\n",
		),
		removeAnchor(
			"apps/mobile/src/app/(tabs)/profile.tsx",
			"\tconst [restoring, setRestoring] = useState(false);\n",
		),
		removeAnchor(
			"apps/mobile/src/app/(tabs)/profile.tsx",
			paymentRestoreAnchor,
		),
		removeAnchor(
			"apps/mobile/src/app/(tabs)/profile.tsx",
			'\t\t\t\t<Chip\n\t\t\t\t\ticon={\n\t\t\t\t\t\t<SymbolView name="crown" size={14} tintColor={theme.colors.ink} />\n\t\t\t\t\t}\n\t\t\t\t\tlabel="Pro"\n\t\t\t\t\tonPress={() => router.push("/paywall")}\n\t\t\t\t/>\n',
		),
		removeAnchor(
			"apps/mobile/src/app/(tabs)/profile.tsx",
			'\t\t\t<View style={styles.section}>\n\t\t\t\t<Text style={styles.sectionTitle}>Subscriptions</Text>\n\t\t\t\t<Pressable\n\t\t\t\t\tonPress={() => router.push("/paywall")}\n\t\t\t\t\tstyle={({ pressed }) => [\n\t\t\t\t\t\tstyles.row,\n\t\t\t\t\t\tpressed ? styles.rowPressed : null,\n\t\t\t\t\t]}\n\t\t\t\t>\n\t\t\t\t\t<Text style={styles.rowLabel}>Pro</Text>\n\t\t\t\t\t<Text style={styles.rowValue}>\n\t\t\t\t\t\t{paymentsReady ? "View plans" : "Not configured"}\n\t\t\t\t\t</Text>\n\t\t\t\t</Pressable>\n\t\t\t\t<Pressable\n\t\t\t\t\tdisabled={restoring}\n\t\t\t\t\tonPress={() => void restorePurchases()}\n\t\t\t\t\tstyle={({ pressed }) => [\n\t\t\t\t\t\tstyles.row,\n\t\t\t\t\t\tstyles.rowBorder,\n\t\t\t\t\t\tpressed ? styles.rowPressed : null,\n\t\t\t\t\t]}\n\t\t\t\t>\n\t\t\t\t\t<Text style={styles.rowLabel}>Restore purchases</Text>\n\t\t\t\t\t<Text style={styles.rowValue}>\n\t\t\t\t\t\t{restoring ? "…" : paymentsReady ? "Restore" : "Setup needed"}\n\t\t\t\t\t</Text>\n\t\t\t\t</Pressable>\n\t\t\t</View>\n\n',
		),
	],
};
