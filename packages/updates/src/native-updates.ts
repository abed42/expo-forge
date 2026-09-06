export type UpdatesModule = typeof import("expo-updates");

let resolved: UpdatesModule | null | undefined;

/**
 * expo-updates registers its native module only when `EXUpdatesEnabled` is
 * true. Debug builds — and any app without an `updates` block in app.json —
 * leave it false, so importing the module at file scope throws "Cannot find
 * native module 'ExpoUpdates'" and takes down every importer with it. This is
 * the single place allowed to touch expo-updates: it resolves the module
 * lazily and reports absence as `null` so callers can degrade to "no updates".
 */
export function loadUpdatesModule(): UpdatesModule | null {
	if (resolved === undefined) {
		try {
			resolved = require("expo-updates") as UpdatesModule;
		} catch {
			resolved = null;
		}
	}

	return resolved;
}
