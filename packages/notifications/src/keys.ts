import { z } from "zod";

// Expo push registration uses native project configuration and does not require any EXPO_PUBLIC_* key.
export const notificationsKeys = z.object({});
