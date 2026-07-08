import { useUpdateStatus } from "@repo/updates";
import { useEffect } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/**
 * Floating "Update ready" pill shown once an OTA update has been downloaded.
 *
 * Checks on mount and every time the app returns to the foreground. Renders
 * null in dev builds because `useUpdateStatus` short-circuits behind the
 * package's `__DEV__` guard — mounting it unconditionally costs nothing.
 */
export function UpdateBanner() {
	const { status, check, reload } = useUpdateStatus();

	useEffect(() => {
		check();

		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				check();
			}
		});

		return () => {
			subscription.remove();
		};
	}, [check]);

	if (status !== "ready") {
		return null;
	}

	return (
		<View style={styles.pill}>
			<Text style={styles.label}>Update ready</Text>
			<Pressable
				accessibilityRole="button"
				onPress={() => reload()}
				style={({ pressed }) => (pressed ? styles.actionPressed : null)}
			>
				<Text style={styles.action}>Restart</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create((theme, rt) => ({
	pill: {
		alignItems: "center",
		alignSelf: "center",
		backgroundColor: theme.colors.ink,
		borderRadius: theme.radius.pill,
		bottom: rt.insets.bottom + 96,
		flexDirection: "row",
		gap: theme.gap(2),
		paddingHorizontal: theme.gap(2.5),
		paddingVertical: theme.gap(1.5),
		position: "absolute",
	},
	label: {
		...theme.type.body,
		color: theme.colors.onInk,
	},
	action: {
		...theme.type.body,
		color: theme.colors.onInk,
		fontWeight: "600",
	},
	actionPressed: {
		opacity: 0.6,
	},
}));
