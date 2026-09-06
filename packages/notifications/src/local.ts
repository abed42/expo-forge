import { Platform } from "react-native";
import { loadNotificationsModule } from "./native-notifications";

export type TestNotificationResult =
	| { ok: true }
	| { ok: false; reason: "denied" | "failed" | "unavailable" };

const ANDROID_DEFAULT_CHANNEL_ID = "default";

// Install once, on first resolve, so the first tap doesn't pay the handler
// setup cost — without a handler, foregrounded apps swallow their own banners.
let handlerInstalled = false;

function notificationsModule(): ReturnType<typeof loadNotificationsModule> {
	const Notifications = loadNotificationsModule();

	if (Notifications && !handlerInstalled) {
		handlerInstalled = true;
		Notifications.setNotificationHandler({
			handleNotification: async () => ({
				shouldPlaySound: false,
				shouldSetBadge: false,
				shouldShowBanner: true,
				shouldShowList: true,
			}),
		});
	}

	return Notifications;
}

// Fires a real OS banner immediately — the demo proof that the
// notification pipeline (permissions + scheduling + foreground display) is
// wired. Local-only: no push token, no EAS project required, simulator-safe.
export async function sendTestNotification(): Promise<TestNotificationResult> {
	const Notifications = notificationsModule();

	if (!Notifications) {
		console.warn(
			"[@repo/notifications] expo-notifications is unavailable in this build.",
		);
		return { ok: false, reason: "unavailable" };
	}

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
