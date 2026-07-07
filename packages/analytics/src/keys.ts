import { z } from "zod";

export const analyticsKeys = z.object({
	EXPO_PUBLIC_POSTHOG_KEY: z.string().startsWith("phc_").optional(),
	EXPO_PUBLIC_POSTHOG_HOST: z.url().optional(),
});
