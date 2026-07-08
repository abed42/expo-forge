import {
	createClient,
	type SupabaseClient,
	type SupportedStorage,
} from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * Resolves the current third-party JWT (e.g. Clerk's session token).
 * Return null when no user is signed in — supabase-js then falls back to the
 * publishable key, so unauthenticated requests still work for public data.
 */
export type SupabaseAccessTokenGetter = () => Promise<string | null>;

export type CreateSupabaseClientOptions = {
	/**
	 * Third-party auth mode. When set, supabase-js calls this getter before
	 * every request and sends the returned JWT as the Authorization bearer —
	 * RLS policies then read its claims via `auth.jwt()`.
	 *
	 * In this mode the built-in Supabase Auth client is disabled: no session
	 * is created or persisted (so `storage`/`storageKey` are ignored) and
	 * calling `supabase.auth.*` methods throws. Identity lives entirely with
	 * the external provider (Clerk).
	 */
	accessToken?: SupabaseAccessTokenGetter;
	/** Supabase-Auth mode only — ignored when `accessToken` is set. */
	storage?: SupportedStorage;
	/** Supabase-Auth mode only — ignored when `accessToken` is set. */
	storageKey?: string;
};

let defaultClient: SupabaseClient<Database> | null = null;

/**
 * Whether the Supabase env vars are present in this bundle. Lets callers
 * degrade gracefully (skeletons, empty states) instead of hitting the
 * fail-loud factories below — e.g. under EXPO_PUBLIC_SKIP_ENV_VALIDATION.
 */
export function isSupabaseConfigured(): boolean {
	// Metro statically inlines process.env.EXPO_PUBLIC_* member expressions in client bundles.
	return Boolean(
		process.env.EXPO_PUBLIC_SUPABASE_URL &&
			process.env.EXPO_PUBLIC_SUPABASE_KEY,
	);
}

function resolveSupabaseEnv(): { supabaseUrl: string; supabaseKey: string } {
	// Metro statically inlines process.env.EXPO_PUBLIC_* member expressions in client bundles.
	const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

	if (!supabaseUrl) {
		throw new Error(
			"[@repo/backend] Missing required environment variable EXPO_PUBLIC_SUPABASE_URL.",
		);
	}

	if (!supabaseKey) {
		throw new Error(
			"[@repo/backend] Missing required environment variable EXPO_PUBLIC_SUPABASE_KEY.",
		);
	}

	return { supabaseUrl, supabaseKey };
}

export function createSupabaseClient(
	options: CreateSupabaseClientOptions = {},
): SupabaseClient<Database> {
	if (options.accessToken) {
		const { supabaseUrl, supabaseKey } = resolveSupabaseEnv();

		// Third-party auth mode is NOT singleton-cached: the token getter is
		// caller-scoped (a React hook memoizes one client per mount — see
		// use-supabase.ts). Auth options are deliberately omitted: with
		// `accessToken`, supabase-js never manages its own session, so auth
		// storage would be dead configuration.
		return createClient<Database>(supabaseUrl, supabaseKey, {
			accessToken: options.accessToken,
		});
	}

	if (defaultClient) {
		return defaultClient;
	}

	const { supabaseUrl, supabaseKey } = resolveSupabaseEnv();

	defaultClient = createClient<Database>(supabaseUrl, supabaseKey, {
		auth: {
			storage: options.storage,
			storageKey: options.storageKey ?? "expo-forge-auth",
			autoRefreshToken: true,
			persistSession: Boolean(options.storage),
			detectSessionInUrl: false,
		},
	});

	return defaultClient;
}

/**
 * Supabase client authenticated by an external provider's JWT (third-party
 * auth). Vendor-agnostic by design: pass any token getter — with Clerk, pass
 * `useAuth().getToken` (or wrap it) and the Clerk session token rides every
 * Data API request, where RLS reads the `sub` claim via `auth.jwt()`.
 *
 * Requires one-time dashboard setup on both sides (see packages/backend/README.md):
 * Clerk → Integrations → Supabase, and Supabase → Authentication → Third Party Auth → Clerk.
 *
 * Creates a new client per call — memoize it (see `useSupabase`).
 */
export function createClerkSupabaseClient(
	getToken: SupabaseAccessTokenGetter,
): SupabaseClient<Database> {
	return createSupabaseClient({ accessToken: getToken });
}
