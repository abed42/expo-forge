import { useState } from "react";
import { useWindowDimensions } from "react-native";
import {
	useKeyboardHandler,
	useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import { useAnimatedStyle, useDerivedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { COMPOSER, GUTTER, sheetTopFromComposerBottom } from "./constants";

/**
 * Where everything on the chat screen sits, derived from the one thing that
 * moves it: the keyboard. The composer rides the keyboard live on the UI
 * thread, while the sheet's React layout takes the keyboard's settled height.
 */
export function useSheetGeometry() {
	const insets = useSafeAreaInsets();
	const { width, height } = useWindowDimensions();
	const keyboard = useReanimatedKeyboardAnimation();
	const [settledKeyboard, setSettledKeyboard] = useState(0);

	// Where the composer's bottom edge rests with no keyboard: on the home
	// indicator's inset, or a gutter up on a device without one.
	const restInset = Math.max(insets.bottom, GUTTER);

	// `height` is negative while the keyboard is up, which is what makes it
	// drop straight into a translate. The keyboard gap rides on the keyboard
	// only, so at rest the composer sits exactly on `restInset`.
	const liftedBy = useDerivedValue(() =>
		Math.max(-keyboard.height.get() + COMPOSER.keyboardGap, restInset),
	);
	const composerBottom = useDerivedValue(() => height - liftedBy.get());
	const composerStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: -liftedBy.get() }],
	}));

	// The grid is laid out in React, so it needs the settled keyboard height as
	// a plain number.
	useKeyboardHandler(
		{
			onEnd: (event) => {
				"worklet";
				scheduleOnRN(setSettledKeyboard, event.height);
			},
		},
		[],
	);

	const settledBottom =
		height - Math.max(settledKeyboard + COMPOSER.keyboardGap, restInset);
	// The lowest the menu may reach: the composer's rest position.
	const sheetFloor = height - restInset;
	const panelTop = sheetTopFromComposerBottom(settledBottom, sheetFloor);
	// The sheet keeps the composer's gutter rather than going full bleed, and
	// stops a gutter short of the bottom of the screen.
	const gridWidth = width - GUTTER * 2;
	const gridHeight = height - panelTop - GUTTER;

	return {
		width,
		height,
		sheetFloor,
		liftedBy,
		composerBottom,
		composerStyle,
		gridWidth,
		gridHeight,
	};
}
