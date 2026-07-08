import type { SupabaseClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";

import {
	createClerkSupabaseClient,
	isSupabaseConfigured,
	type SupabaseAccessTokenGetter,
} from "./client";
import type { Database } from "./database.types";

/**
 * Nullable variant of `useSupabase`: returns `null` instead of throwing when
 * the Supabase env vars are unset (e.g. keyless boots under
 * EXPO_PUBLIC_SKIP_ENV_VALIDATION), so screens can degrade to placeholder
 * states. All hooks run unconditionally — safe under the rules of hooks.
 */
export function useSupabaseIfConfigured(
	getToken: SupabaseAccessTokenGetter,
): SupabaseClient<Database> | null {
	const getTokenRef = useRef(getToken);
	getTokenRef.current = getToken;

	const [client] = useState(() =>
		isSupabaseConfigured()
			? createClerkSupabaseClient(() => getTokenRef.current())
			: null,
	);

	return client;
}

/**
 * Memoizes a third-party-auth Supabase client for the lifetime of the
 * component. The client is created once per mount, but the token getter is
 * kept fresh through a ref, so every request reads the latest Clerk session
 * token even though `useAuth().getToken` gets a new identity each render.
 *
 * Fails loud when the Supabase env vars are unset — use
 * `useSupabaseIfConfigured` where graceful degradation is wanted instead.
 *
 * Vendor-agnostic: the auth vendor is injected by the caller, so
 * `@repo/backend` never imports `@repo/auth`. Typical app-side wiring:
 *
 * ```ts
 * const { getToken } = useAuth(); // @repo/auth (Clerk)
 * const supabase = useSupabase(getToken);
 * ```
 */
export function useSupabase(
	getToken: SupabaseAccessTokenGetter,
): SupabaseClient<Database> {
	const client = useSupabaseIfConfigured(getToken);

	if (!client) {
		throw new Error(
			"[@repo/backend] Missing required environment variable EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY.",
		);
	}

	return client;
}
