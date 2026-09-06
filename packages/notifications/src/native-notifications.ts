export type NotificationsModule = typeof import("expo-notifications");

let resolved: NotificationsModule | null | undefined;

/**
 * Importing expo-notifications pulls in its push-token module, which throws
 * "Cannot find native module 'ExpoPushTokenManager'" wherever that module is
 * unavailable — simulator builds among them. At file scope that takes down
 * every importer, including the local-notification paths that never needed a
 * push token. This is the single place allowed to touch expo-notifications: it
 * resolves the module lazily and reports absence as `null`.
 */
export function loadNotificationsModule(): NotificationsModule | null {
	if (resolved === undefined) {
		try {
			resolved = require("expo-notifications") as NotificationsModule;
		} catch {
			resolved = null;
		}
	}

	return resolved;
}
