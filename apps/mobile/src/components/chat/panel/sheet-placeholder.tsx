import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/**
 * What a sheet shows when it has no content to show — the grid while the
 * library loads or stays denied, the camera while it waits for permission.
 */
export function SheetPlaceholder({ children }: { children: ReactNode }) {
	return (
		<View style={styles.placeholder}>
			<Text style={styles.placeholderText}>{children}</Text>
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	placeholder: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 48,
	},
	placeholderText: {
		color: theme.colors.chat.placeholder,
		fontSize: 15,
		textAlign: "center",
	},
}));
