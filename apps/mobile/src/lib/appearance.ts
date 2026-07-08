import * as SecureStore from "expo-secure-store";
import { UnistylesRuntime } from "react-native-unistyles";

// System is the default: Unistyles adaptiveThemes follows the OS. Choosing
// Light/Dark pins the theme and persists across launches. SecureStore is
// used because it's already in the binary — swap for the storage package
// (MMKV) when it lands; the preference is a single short string either way.
export type AppearancePreference = "system" | "light" | "dark";

const KEY = "appearance-preference";

export const APPEARANCE_LABELS: Record<AppearancePreference, string> = {
	system: "System",
	light: "Light",
	dark: "Dark",
};

export function applyAppearance(preference: AppearancePreference) {
	if (preference === "system") {
		UnistylesRuntime.setAdaptiveThemes(true);
		return;
	}
	UnistylesRuntime.setAdaptiveThemes(false);
	UnistylesRuntime.setTheme(preference);
}

export async function loadAppearance(): Promise<AppearancePreference> {
	const stored = await SecureStore.getItemAsync(KEY).catch(() => null);
	return stored === "light" || stored === "dark" ? stored : "system";
}

export function saveAppearance(preference: AppearancePreference) {
	applyAppearance(preference);
	SecureStore.setItemAsync(KEY, preference).catch(() => {
		// Persistence is best-effort: the in-session theme is already applied.
	});
}
