import { Image } from "expo-image";
import { StyleSheet as RNStyleSheet } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import {
	COMPOSER,
	COMPOSER_STRIP_HEIGHT,
	type Frame,
	GRID,
	GUTTER,
	mix,
} from "../constants";
import type { LibraryPhoto } from "../photos/use-photo-library";

export interface Flight {
	photo: LibraryPhoto;
	/**
	 * The cell the photo was sitting in, in window coordinates, measured off
	 * the grid on the frame the flight starts: the thumbnail leaves the place
	 * the photo actually occupied, not the sheet that contained it.
	 */
	from: Frame;
	/** Index of the composer slot it is landing on. */
	slot: number;
	/**
	 * Corner radius it leaves with. A grid cell's hairline radius by default; a
	 * camera capture leaves as the whole sheet and starts from the sheet's own.
	 */
	fromRadius?: number;
}

interface FlyingPhotoProps {
	flight: Flight;
	screenWidth: number;
	/** 0 still in the grid → 1 landed on its slot in the composer. */
	attach: SharedValue<number>;
	/**
	 * The composer grows around the strip on its own spring, so the slot being
	 * flown into is still rising while the photo flies. Read live.
	 */
	strip: SharedValue<number>;
	/** Window Y of the composer's bottom edge, tracked live off the keyboard. */
	composerBottom: SharedValue<number>;
}

function FlyingPhoto({
	flight,
	screenWidth,
	attach,
	strip,
	composerBottom,
}: FlyingPhotoProps) {
	const style = useAnimatedStyle(() => {
		const a = attach.get();

		const composerTop =
			composerBottom.get() -
			COMPOSER.rowHeight -
			strip.get() * COMPOSER_STRIP_HEIGHT;
		const step = COMPOSER.thumbSize + COMPOSER.thumbGap;
		// The strip scrolls, so a slot past the right edge has nowhere to land.
		// Pinning it to the last visible one is what the strip does to it anyway.
		const lastVisible =
			screenWidth - GUTTER - COMPOSER.stripPaddingTop - COMPOSER.thumbSize;
		const toX = Math.min(
			GUTTER + COMPOSER.stripPaddingTop + flight.slot * step,
			lastVisible,
		);
		const toY = composerTop + COMPOSER.stripPaddingTop;

		return {
			left: mix(a, flight.from.x, toX),
			top: mix(a, flight.from.y, toY),
			width: mix(a, flight.from.w, COMPOSER.thumbSize),
			height: mix(a, flight.from.h, COMPOSER.thumbSize),
			borderRadius: mix(
				a,
				flight.fromRadius ?? GRID.cellRadius,
				COMPOSER.thumbRadius,
			),
		};
	});

	return (
		<Animated.View pointerEvents="none" style={[styles.photo, style]}>
			<Image
				source={flight.photo.id}
				recyclingKey={flight.photo.id}
				contentFit="cover"
				cachePolicy="memory-disk"
				priority="high"
				// Already decoded — the same image the grid is drawing, handed over
				// on the frame the cell hides. A fade here would show the sheet
				// through the photo for the length of it.
				transition={0}
				style={RNStyleSheet.absoluteFill}
			/>
		</Animated.View>
	);
}

interface AttachmentFlightProps extends Omit<FlyingPhotoProps, "flight"> {
	flights: Flight[];
}

/**
 * The photos crossing from the grid to the composer. Copies, not the cells
 * themselves: the cells belong to a list inside a sheet that is collapsing at
 * the same time. Every copy rides the same `attach` spring — they were picked
 * together and they arrive together.
 */
export function AttachmentFlight({
	flights,
	...drivers
}: AttachmentFlightProps) {
	if (!flights.length) {
		return null;
	}

	return (
		<>
			{flights.map((flight) => (
				<FlyingPhoto key={flight.photo.id} flight={flight} {...drivers} />
			))}
		</>
	);
}

const styles = StyleSheet.create((theme) => ({
	photo: {
		position: "absolute",
		overflow: "hidden",
		borderCurve: "continuous",
		backgroundColor: theme.colors.chat.photoFill,
	},
}));
