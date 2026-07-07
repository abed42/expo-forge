import { z } from "zod";

export const observabilityKeys = z.object({
	EXPO_PUBLIC_SENTRY_DSN: z.url().optional(),
});
