import { z } from "zod";

export const authKeys = z.object({
	EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
});
