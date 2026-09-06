import { type ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";

type ShimmerProps = {
	children: ReactNode;
	style?: ViewStyle;
};

// Opacity pulse for loading placeholders. Wrap static Skeleton blocks in it
// only while data is genuinely in flight — a pulse promises content, so it
// must never sit on an empty or error state.
export function Shimmer({ children, style }: ShimmerProps) {
	const opacity = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {
					duration: 650,
					easing: Easing.inOut(Easing.ease),
					toValue: 0.4,
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					duration: 650,
					easing: Easing.inOut(Easing.ease),
					toValue: 1,
					useNativeDriver: true,
				}),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [opacity]);

	return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
