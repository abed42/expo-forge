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

export type RegisterForPushFailureReason =
	| "simulator"
	| "denied"
	| "missing-project-id"
	| "token-failure";

export type RegisterForPushResult =
	| { ok: true; token: string }
	| {
			ok: false;
			reason: RegisterForPushFailureReason;
			/**
			 * Only present on the "denied" path. `false` means the OS will not show
			 * the permission prompt again — the user must enable notifications from
			 * system settings.
			 */
			canAskAgain?: boolean;
	  };

function getProjectId(): string | null {
	const expoConfig = Constants.expoConfig as ExpoConfigWithEasProjectId | null;
	const easConfig = Constants.easConfig as EasConfigWithProjectId | null;

	return expoConfig?.extra?.eas?.projectId ?? easConfig?.projectId ?? null;
}

export async function registerForPush(): Promise<RegisterForPushResult> {
	if (!Device.isDevice) {
		console.info(
			"[@repo/notifications] Push registration is unavailable on simulators and emulators.",
		);
		return { ok: false, reason: "simulator" };
	}

	// Check configuration before prompting: without an EAS projectId the
	// registration can never succeed, so don't show a permission dialog.
	const projectId = getProjectId();

	if (!projectId) {
		console.warn(
			"[@repo/notifications] Push registration skipped because no EAS projectId is configured.",
		);
		return { ok: false, reason: "missing-project-id" };
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

	let permissions = await Notifications.getPermissionsAsync();

	if (permissions.status !== "granted") {
		permissions = await Notifications.requestPermissionsAsync();
	}

	if (permissions.status !== "granted") {
		console.info(
			"[@repo/notifications] Push registration skipped because notification permissions were not granted.",
		);
		return {
			ok: false,
			reason: "denied",
			canAskAgain: permissions.canAskAgain,
		};
	}

	try {
		const token = await Notifications.getExpoPushTokenAsync({ projectId });
		return { ok: true, token: token.data };
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
		return { ok: false, reason: "token-failure" };
	}
}
