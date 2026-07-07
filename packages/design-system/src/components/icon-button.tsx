import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type IconButtonProps = {
	children: ReactNode;
	onPress?: () => void;
	accessibilityLabel: string;
};

const SIZE = 44;

export function IconButton({
	children,
	onPress,
	accessibilityLabel,
}: IconButtonProps) {
	return (
		<Pressable
			accessibilityLabel={accessibilityLabel}
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				pressed ? styles.buttonPressed : null,
			]}
		>
			{children}
		</Pressable>
	);
}

const styles = StyleSheet.create((theme) => ({
	button: {
		alignItems: "center",
		backgroundColor: theme.colors.fill,
		borderRadius: SIZE / 2,
		height: SIZE,
		justifyContent: "center",
		width: SIZE,
	},
	buttonPressed: {
		opacity: 0.72,
	},
}));
