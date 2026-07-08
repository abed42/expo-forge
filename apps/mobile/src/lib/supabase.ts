import { useAuth } from "@repo/auth";
import { useSupabase } from "@repo/backend";

/**
 * Clerk-authenticated Supabase client (third-party auth).
 *
 * Combines Clerk's `getToken` with the vendor-agnostic `useSupabase` hook:
 * the Clerk session JWT rides every Data API request as the Authorization
 * bearer, and RLS policies key on its `sub` claim (the Clerk user id) via
 * `auth.jwt()` — see packages/backend/supabase/migrations/0002_clerk_rls.sql.
 *
 * Usage inside any component under <AuthProvider>:
 *
 * ```ts
 * const supabase = useSupabaseClient();
 * const { data } = await supabase.from("profiles").select("*");
 * ```
 */
export function useSupabaseClient() {
	const { getToken } = useAuth();
	return useSupabase(getToken);
}
