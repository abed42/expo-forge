import * as Notifications from "expo-notifications";

export type TestNotificationResult =
	| { ok: true }
	| { ok: false; reason: "denied" | "failed" };

let handlerInstalled = false;

// Fires a real OS banner ~2s after the call — the demo proof that the
// notification pipeline (permissions + scheduling + foreground display) is
// wired. Local-only: no push token, no EAS project required, simulator-safe.
export async function sendTestNotification(): Promise<TestNotificationResult> {
	try {
		let permissions = await Notifications.getPermissionsAsync();
		if (permissions.status !== "granted") {
			permissions = await Notifications.requestPermissionsAsync();
		}
		if (permissions.status !== "granted") {
			return { ok: false, reason: "denied" };
		}

		if (!handlerInstalled) {
			// Without a handler, foregrounded apps swallow their own banners.
			Notifications.setNotificationHandler({
				handleNotification: async () => ({
					shouldPlaySound: false,
					shouldSetBadge: false,
					shouldShowBanner: true,
					shouldShowList: true,
				}),
			});
			handlerInstalled = true;
		}

		await Notifications.scheduleNotificationAsync({
			content: {
				body: "Notifications are wired. This banner came from the OS, not the app.",
				title: "expo-forge 🔨",
			},
			trigger: {
				seconds: 2,
				type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
			},
		});
		return { ok: true };
	} catch (error) {
		console.error("[@repo/notifications] test notification failed:", error);
		return { ok: false, reason: "failed" };
	}
}
