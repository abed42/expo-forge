import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type SkeletonProps = {
	width: number;
	height?: number;
	radius?: number;
};

// Static placeholder bar for absent data. Deliberately not animated in the
// template skeleton — swap in a shimmer when the demo data layer lands.
export function Skeleton({ width, height = 14, radius }: SkeletonProps) {
	return (
		<View
			style={[
				styles.skeleton,
				{ borderRadius: radius ?? height / 2, height, width },
			]}
		/>
	);
}

const styles = StyleSheet.create((theme) => ({
	skeleton: {
		backgroundColor: theme.colors.fill,
	},
}));
