import { z } from "zod";

export const paymentsKeys = z.object({
	EXPO_PUBLIC_REVENUECAT_API_KEY: z.string().min(1).optional(),
});
