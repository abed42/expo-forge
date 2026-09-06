import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
	Platform,
	StyleSheet as RNStyleSheet,
	View,
	type ViewProps,
	type ViewStyle,
} from "react-native";
import Animated, { type AnimatedProps } from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

/** True on iOS 26+, where `expo-glass-effect` renders the real material. */
const LIQUID_GLASS = isLiquidGlassAvailable();

/**
 * Whether a `BlurView` here actually samples what is behind it. On Android
 * the sheet is hosted over the keyboard in a window of its own, so a blur
 * there finds nothing behind itself — surfaces below fall back to the flat
 * colour they were measured at.
 */
const BLURS_ITS_BACKDROP = Platform.OS !== "android";

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

export type GlassStyleName = "regular" | "none";

/**
 * A `GlassView` cannot be brought in or out by animating opacity — under an
 * animated `opacity` it renders nothing at all. It has its own native
 * transition for exactly this, so every glass surface here is mounted at a
 * fixed opacity and switched between styles instead. The first render always
 * starts at `none` so the transition has somewhere to come from.
 */
function useGlassStyle(target: GlassStyleName, duration: number) {
	const [style, setStyle] = useState<GlassStyleName>("none");
	useEffect(() => setStyle(target), [target]);
	return { style, animate: true, animationDuration: duration };
}

/**
 * Shape without a clip: the native view rounds itself off its own radius, and
 * clipping it is what stops an interactive surface from rendering the bulge it
 * makes under a finger.
 */
function shapeOf(radius: number): ViewStyle {
	return { borderRadius: radius, borderCurve: "continuous" };
}

export interface GlassProps extends ViewProps {
	/** Fill for the `expo-blur` stand-in only. */
	fallbackTint?: string;
	/** Corner radius; the native view rounds the material to it. */
	radius?: number;
	/** Whether the glass is showing. Transitions natively, never by opacity. */
	active?: boolean;
	/** True for a control that should bulge under a press; false for a container. */
	interactive?: boolean;
	/** Transition length in seconds. */
	duration?: number;
	children?: ReactNode;
}

/**
 * A glass surface: the ‹ button, the confirm pill, the composer bar and the
 * camera controls. Neither this nor any ancestor clips — the press reaction
 * draws outside the view's bounds.
 */
export function Glass({
	fallbackTint,
	radius = 0,
	active = true,
	interactive = true,
	duration = 0.25,
	style,
	children,
	...rest
}: GlassProps) {
	const { theme } = useUnistyles();
	const glassEffectStyle = useGlassStyle(active ? "regular" : "none", duration);

	if (!LIQUID_GLASS) {
		return (
			<BlurView
				intensity={60}
				tint="systemChromeMaterialDark"
				// The fallback is a blur, and a blur does have to clip to its shape.
				style={[shapeOf(radius), styles.clip, style]}
				{...rest}
			>
				<View
					pointerEvents="none"
					style={[
						RNStyleSheet.absoluteFill,
						{ backgroundColor: fallbackTint ?? theme.colors.chat.controlScrim },
					]}
				/>
				{children}
			</BlurView>
		);
	}

	return (
		<GlassView
			glassEffectStyle={glassEffectStyle}
			colorScheme="dark"
			isInteractive={interactive}
			style={[shapeOf(radius), style]}
			{...rest}
		>
			{children}
		</GlassView>
	);
}

/**
 * The frosted material the attachment panel is made of — real liquid glass
 * where the OS has it, `expo-blur` tuned to the same measurement below iOS 26,
 * and a flat fill on Android. `style` carries the panel's live corner radius.
 */
export function PanelMaterial({
	variant,
	duration,
	style,
}: {
	variant: "regular" | "none";
	duration: number;
	/** Animated: the panel drives the material's corner radius through this. */
	style?: AnimatedProps<ViewProps>["style"];
}) {
	const glassEffectStyle = useGlassStyle(variant, duration);

	if (!LIQUID_GLASS) {
		if (variant === "none") {
			return null;
		}
		return (
			<Animated.View pointerEvents="none" style={[styles.clip, style]}>
				{BLURS_ITS_BACKDROP ? (
					<BlurView
						intensity={70}
						tint="systemUltraThinMaterialDark"
						style={RNStyleSheet.absoluteFill}
					>
						<View
							pointerEvents="none"
							style={[RNStyleSheet.absoluteFill, styles.fallbackTint]}
						/>
					</BlurView>
				) : (
					<View
						pointerEvents="none"
						style={[RNStyleSheet.absoluteFill, styles.flatMaterial]}
					/>
				)}
			</Animated.View>
		);
	}

	return (
		<AnimatedGlassView
			glassEffectStyle={glassEffectStyle}
			colorScheme="dark"
			isInteractive
			style={[styles.shape, style]}
		/>
	);
}

const styles = StyleSheet.create((theme) => ({
	shape: {
		borderCurve: "continuous",
	},
	clip: {
		overflow: "hidden",
	},
	fallbackTint: {
		backgroundColor: theme.colors.chat.material,
	},
	flatMaterial: {
		backgroundColor: theme.colors.chat.materialFlat,
	},
}));
