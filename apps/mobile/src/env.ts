import { analyticsKeys } from "@repo/analytics";
import { authKeys } from "@repo/auth/keys";
import { backendKeys } from "@repo/backend/keys";
import { composeEnv } from "@repo/env";
import { observabilityKeys } from "@repo/observability";

// Importing this module validates the app's composed env once at boot —
// missing required keys fail loud with the full variable list.
// Escape hatch for keyless boots: EXPO_PUBLIC_SKIP_ENV_VALIDATION=true.
export const env = composeEnv(
	authKeys,
	backendKeys,
	analyticsKeys,
	observabilityKeys,
);
