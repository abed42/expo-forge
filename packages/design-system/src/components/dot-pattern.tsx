import { useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type DotPatternProps = {
	/** Distance between dot centres, in points. */
	gap?: number;
	/** Dot diameter, in points. */
	dotSize?: number;
};

// Neutral polka-dot texture for placeholder surfaces. Dots carry no loading
// semantics, so a card wearing this reads as "decor" rather than "pending".
// Fills its parent (which must be `position: relative` with overflow hidden)
// and sizes the grid from the measured layout — no image assets involved.
export function DotPattern({ gap = 28, dotSize = 3 }: DotPatternProps) {
	const [size, setSize] = useState({ height: 0, width: 0 });

	const onLayout = (event: LayoutChangeEvent) => {
		const { height, width } = event.nativeEvent.layout;
		setSize((previous) =>
			previous.height === height && previous.width === width
				? previous
				: { height, width },
		);
	};

	const columns = Math.floor(size.width / gap);
	const rows = Math.floor(size.height / gap);
	const count = Math.max(0, columns * rows);
	const spacing = gap - dotSize;
	// Centre the grid: the wrap layout spans columns*gap minus one trailing gap.
	const paddingHorizontal = Math.max(
		0,
		(size.width - (columns * gap - spacing)) / 2,
	);
	const paddingVertical = Math.max(
		0,
		(size.height - (rows * gap - spacing)) / 2,
	);

	return (
		<View
			onLayout={onLayout}
			pointerEvents="none"
			style={[
				styles.grid,
				{ gap: spacing, paddingHorizontal, paddingVertical },
			]}
		>
			{Array.from({ length: count }, (_, index) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: dots are identical and stateless; position is their identity.
					key={index}
					style={[
						styles.dot,
						{ borderRadius: dotSize / 2, height: dotSize, width: dotSize },
					]}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	grid: {
		bottom: 0,
		flexDirection: "row",
		flexWrap: "wrap",
		left: 0,
		overflow: "hidden",
		position: "absolute",
		right: 0,
		top: 0,
	},
	dot: {
		backgroundColor: theme.colors.secondary,
		opacity: 0.35,
	},
}));
