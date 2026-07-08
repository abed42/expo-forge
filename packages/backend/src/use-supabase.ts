import type { SupabaseClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";

import {
	createClerkSupabaseClient,
	type SupabaseAccessTokenGetter,
} from "./client";
import type { Database } from "./database.types";

/**
 * Memoizes a third-party-auth Supabase client for the lifetime of the
 * component. The client is created once per mount, but the token getter is
 * kept fresh through a ref, so every request reads the latest Clerk session
 * token even though `useAuth().getToken` gets a new identity each render.
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
	const getTokenRef = useRef(getToken);
	getTokenRef.current = getToken;

	const [client] = useState(() =>
		createClerkSupabaseClient(() => getTokenRef.current()),
	);

	return client;
}
