import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const ANDROID_DEFAULT_CHANNEL_ID = "default";

type ExpoConfigWithEasProjectId = {
	extra?: {
		eas?: {
			projectId?: string;
		};
	};
};

type EasConfigWithProjectId = {
	projectId?: string;
};

function getProjectId(): string | null {
	const expoConfig = Constants.expoConfig as ExpoConfigWithEasProjectId | null;
	const easConfig = Constants.easConfig as EasConfigWithProjectId | null;

	return expoConfig?.extra?.eas?.projectId ?? easConfig?.projectId ?? null;
}

export async function registerForPush(): Promise<string | null> {
	if (!Device.isDevice) {
		console.info(
			"[@repo/notifications] Push registration is unavailable on simulators and emulators.",
		);
		return null;
	}

	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync(
			ANDROID_DEFAULT_CHANNEL_ID,
			{
				name: "Default",
				importance: Notifications.AndroidImportance.DEFAULT,
			},
		);
	}

	const permissions = await Notifications.getPermissionsAsync();
	let finalStatus = permissions.status;

	if (finalStatus !== "granted") {
		const requestedPermissions = await Notifications.requestPermissionsAsync();
		finalStatus = requestedPermissions.status;
	}

	if (finalStatus !== "granted") {
		console.info(
			"[@repo/notifications] Push registration skipped because notification permissions were not granted.",
		);
		return null;
	}

	const projectId = getProjectId();

	if (!projectId) {
		console.warn(
			"[@repo/notifications] Push registration skipped because no EAS projectId is configured.",
		);
		return null;
	}

	try {
		const token = await Notifications.getExpoPushTokenAsync({ projectId });
		return token.data;
	} catch (error: unknown) {
		const resolvedError =
			error instanceof Error
				? error
				: new Error(
						"[@repo/notifications] Unknown error while requesting an Expo push token.",
					);

		console.warn(
			"[@repo/notifications] Failed to register for push notifications.",
			resolvedError,
		);
		return null;
	}
}
