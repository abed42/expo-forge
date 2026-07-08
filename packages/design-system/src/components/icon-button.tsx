import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type IconButtonProps = {
	children: ReactNode;
	onPress?: () => void;
	accessibilityLabel: string;
	/** Render on the iOS 26 liquid-glass material (falls back to fill). */
	glass?: boolean;
};

const SIZE = 44;

// isLiquidGlassAvailable must gate every GlassView use: some iOS 26 builds
// lack the API and crash without the check (SDK 57 known issue).
const canUseGlass = isLiquidGlassAvailable();

export function IconButton({
	children,
	onPress,
	accessibilityLabel,
	glass = false,
}: IconButtonProps) {
	const useGlass = glass && canUseGlass;

	return (
		<Pressable
			accessibilityLabel={accessibilityLabel}
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				useGlass ? styles.buttonGlassHost : null,
				pressed ? styles.buttonPressed : null,
			]}
		>
			{useGlass ? (
				<GlassView glassEffectStyle="regular" style={styles.glass}>
					{children}
				</GlassView>
			) : (
				children
			)}
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
	buttonGlassHost: {
		backgroundColor: "transparent",
	},
	glass: {
		alignItems: "center",
		borderRadius: SIZE / 2,
		height: SIZE,
		justifyContent: "center",
		width: SIZE,
	},
	buttonPressed: {
		opacity: 0.72,
	},
}));
