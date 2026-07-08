import {
	createClient,
	type SupabaseClient,
	type SupportedStorage,
} from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type CreateSupabaseClientOptions = {
	storage?: SupportedStorage;
	storageKey?: string;
};

let supabaseClient: SupabaseClient<Database> | null = null;

export function createSupabaseClient(
	options: CreateSupabaseClientOptions = {},
): SupabaseClient<Database> {
	if (supabaseClient) {
		return supabaseClient;
	}

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

	supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
		auth: {
			storage: options.storage,
			storageKey: options.storageKey ?? "expo-forge-auth",
			autoRefreshToken: true,
			persistSession: Boolean(options.storage),
			detectSessionInUrl: false,
		},
	});

	return supabaseClient;
}
