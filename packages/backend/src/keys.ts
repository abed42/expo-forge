import { z } from "zod";

export const backendKeys = z.object({
	EXPO_PUBLIC_SUPABASE_URL: z.url(),
	EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});
