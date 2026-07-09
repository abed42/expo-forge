import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type TestNotificationResult =
	| { ok: true }
	| { ok: false; reason: "denied" | "failed" };

const ANDROID_DEFAULT_CHANNEL_ID = "default";

// Install once at module load so the first tap doesn't pay the handler setup
// cost — without a handler, foregrounded apps swallow their own banners.
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldPlaySound: false,
		shouldSetBadge: false,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
});

// Fires a real OS banner immediately — the demo proof that the
// notification pipeline (permissions + scheduling + foreground display) is
// wired. Local-only: no push token, no EAS project required, simulator-safe.
export async function sendTestNotification(): Promise<TestNotificationResult> {
	try {
		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync(
				ANDROID_DEFAULT_CHANNEL_ID,
				{
					name: "Default",
					importance: Notifications.AndroidImportance.HIGH,
				},
			);
		}

		let permissions = await Notifications.getPermissionsAsync();
		if (permissions.status !== "granted") {
			permissions = await Notifications.requestPermissionsAsync();
		}
		if (permissions.status !== "granted") {
			return { ok: false, reason: "denied" };
		}

		await Notifications.scheduleNotificationAsync({
			content: {
				body: "Notifications are wired. This banner came from the OS, not the app.",
				title: "expo-forge 🔨",
				...(Platform.OS === "android"
					? { channelId: ANDROID_DEFAULT_CHANNEL_ID }
					: null),
			},
			// null trigger = present immediately; a timed trigger is "no earlier
			// than", so even 1–2s can stretch on iOS.
			trigger: null,
		});
		return { ok: true };
	} catch (error) {
		console.error("[@repo/notifications] test notification failed:", error);
		return { ok: false, reason: "failed" };
	}
}
