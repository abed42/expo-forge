import { z } from "zod";

export const backendKeys = z.object({
	EXPO_PUBLIC_SUPABASE_URL: z.url(),
	// Supabase's current dashboard issues "publishable" keys (sb_publishable_…),
	// the successor to the legacy anon JWT — same client-safe role.
	EXPO_PUBLIC_SUPABASE_KEY: z.string().min(1),
});
