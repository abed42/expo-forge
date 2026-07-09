// Vendor manifest — the single source of truth the init wizard iterates.
// Mirrors packages/*/src/keys.ts (the Zod schemas the app validates at boot);
// when a package's keys.ts changes, update the matching entry here.

export type VendorKeySpec = {
	/** EXPO_PUBLIC_* variable written to apps/mobile/.env.local */
	env: string;
	label: string;
	placeholder: string;
	/** Returns an error message for invalid input, undefined when valid. */
	validate: (value: string) => string | undefined;
};

export type RemovablePackage = "analytics" | "observability" | "payments";

export type Vendor = {
	id: "clerk" | "supabase" | "posthog" | "sentry" | "revenuecat";
	name: string;
	/** Where to find the key — shown in prompts and .env.local comments. */
	hint: string;
	required: boolean;
	/** Optional vendors only: the packages/<pkg> workspace deleted on "Remove". */
	pkg?: RemovablePackage;
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
		pkg: "analytics",
		keys: [
			{
				env: "EXPO_PUBLIC_POSTHOG_KEY",
				label: "PostHog project API key",
				placeholder: "phc_...",
				validate: (value) =>
					/^phc_/.test(value) ? undefined : 'Must start with "phc_"',
			},
		],
	},
	{
		id: "sentry",
		name: "Sentry",
		hint: "sentry.io -> Project Settings -> Client Keys (DSN)",
		required: false,
		pkg: "observability",
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
		pkg: "payments",
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

export const removalEdits: Record<RemovablePackage, AnchorEdit[]> = {
	analytics: [
		{
			file: "apps/mobile/src/env.ts",
			find: 'import { analyticsKeys } from "@repo/analytics";\n',
			replace: "",
		},
		{
			file: "apps/mobile/src/env.ts",
			find: "\tanalyticsKeys,\n",
			replace: "",
		},
		{
			file: "apps/mobile/src/app/_layout.tsx",
			find: 'import { AnalyticsProvider } from "@repo/analytics";\n',
			replace: "",
		},
		{
			file: "apps/mobile/src/app/_layout.tsx",
			find: "\t\t\t\t<AnalyticsProvider>\n\t\t\t\t\t<RootNavigator />\n\t\t\t\t</AnalyticsProvider>\n",
			replace: "\t\t\t\t<RootNavigator />\n",
		},
	],
	observability: [
		{
			file: "apps/mobile/src/env.ts",
			find: 'import { observabilityKeys } from "@repo/observability";\n',
			replace: "",
		},
		{
			file: "apps/mobile/src/env.ts",
			find: "\tobservabilityKeys,\n",
			replace: "",
		},
		{
			file: "apps/mobile/src/app/_layout.tsx",
			find: 'import { initObservability } from "@repo/observability";\n',
			replace: "",
		},
		{
			file: "apps/mobile/src/app/_layout.tsx",
			find: "initObservability();\n\n",
			replace: "",
		},
	],
	// @repo/payments is wired into env composition + boot configurePayments —
	// strip those anchors when the vendor is removed.
	payments: [
		{
			file: "apps/mobile/src/env.ts",
			find: 'import { paymentsKeys } from "@repo/payments";\n',
			replace: "",
		},
		{
			file: "apps/mobile/src/env.ts",
			find: "\tpaymentsKeys,\n",
			replace: "",
		},
		{
			file: "apps/mobile/src/app/_layout.tsx",
			find: 'import { configurePayments } from "@repo/payments";\n',
			replace: "",
		},
		{
			file: "apps/mobile/src/app/_layout.tsx",
			find: "configurePayments();\n\n",
			replace: "",
		},
	],
};
