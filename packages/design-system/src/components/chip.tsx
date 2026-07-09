import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type ChipProps = {
	label: string;
	/** Optional leading glyph (SF Symbol, tinted Image, etc.). */
	icon?: ReactNode;
	/** Optional trailing count — rendered muted next to the label. */
	count?: number | string;
	onPress?: () => void;
	selected?: boolean;
};

/**
 * Compact pill chip: icon + label + optional count. Used for profile
 * shortcuts and filter rows. Pressable when `onPress` is set; otherwise a
 * static badge.
 */
export function Chip({
	label,
	icon,
	count,
	onPress,
	selected = false,
}: ChipProps) {
	const content = (
		<>
			{icon ? <View style={styles.icon}>{icon}</View> : null}
			<Text style={[styles.label, selected ? styles.labelSelected : null]}>
				{label}
			</Text>
			{count != null ? (
				<Text style={[styles.count, selected ? styles.countSelected : null]}>
					{count}
				</Text>
			) : null}
		</>
	);

	if (onPress) {
		return (
			<Pressable
				accessibilityRole="button"
				onPress={onPress}
				style={({ pressed }) => [
					styles.chip,
					selected ? styles.chipSelected : null,
					pressed ? styles.chipPressed : null,
				]}
			>
				{content}
			</Pressable>
		);
	}

	return (
		<View style={[styles.chip, selected ? styles.chipSelected : null]}>
			{content}
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	chip: {
		alignItems: "center",
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.pill,
		flexDirection: "row",
		gap: theme.gap(0.75),
		minHeight: 36,
		paddingHorizontal: theme.gap(1.5),
		paddingVertical: theme.gap(0.75),
	},
	chipSelected: {
		backgroundColor: theme.colors.ink,
	},
	chipPressed: {
		opacity: 0.75,
	},
	icon: {
		alignItems: "center",
		height: 16,
		justifyContent: "center",
		width: 16,
	},
	label: {
		...theme.type.caption,
		color: theme.colors.ink,
		fontWeight: "600",
	},
	labelSelected: {
		color: theme.colors.onInk,
	},
	count: {
		...theme.type.caption,
		color: theme.colors.secondary,
		fontWeight: "500",
	},
	countSelected: {
		color: theme.colors.onInk,
		opacity: 0.7,
	},
}));
