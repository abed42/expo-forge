import { Pressable, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type ButtonProps = {
	label: string;
	onPress?: () => void;
	disabled?: boolean;
};

export function Button({ label, onPress, disabled = false }: ButtonProps) {
	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				pressed ? styles.buttonPressed : null,
				disabled ? styles.buttonDisabled : null,
			]}
		>
			<Text style={[styles.label, disabled ? styles.labelDisabled : null]}>
				{label}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create((theme) => ({
	button: {
		alignItems: "center",
		backgroundColor: theme.colors.ink,
		borderRadius: theme.radius.pill,
		justifyContent: "center",
		minHeight: 48,
		opacity: 1,
		paddingHorizontal: theme.gap(3),
		paddingVertical: theme.gap(1.5),
	},
	buttonPressed: {
		opacity: 0.85,
	},
	buttonDisabled: {
		opacity: 0.45,
	},
	label: {
		...theme.type.body,
		color: theme.colors.onInk,
		fontWeight: "600",
	},
	labelDisabled: {
		opacity: 0.9,
	},
}));
