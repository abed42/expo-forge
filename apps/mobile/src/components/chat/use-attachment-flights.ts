import { useCallback, useEffect, useState } from "react";
import { useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { Flight } from "./composer/attachment-flight";
import { SPRING } from "./constants";
import type { LibraryPhoto } from "./photos/use-photo-library";

interface FlightOptions {
	/** The panel's half of the leave — `collapseForLeave` on the panel hook. */
	collapsePanel: () => void;
	/** The panel's half of the landing — `resetAfterLeave` on the panel hook. */
	resetPanel: () => void;
	/** Called as the flight lands, so the screen can drop its selection. */
	onSettled?: () => void;
}

/**
 * The composer's attachments and the photos flying into them. Owns `attach`
 * (the flight's progress) and `strip` (the slot it is aiming at), and the one
 * move that needs the panel: `attachAndLeave`.
 */
export function useAttachmentFlights({
	collapsePanel,
	resetPanel,
	onSettled,
}: FlightOptions) {
	const [attachments, setAttachments] = useState<LibraryPhoto[]>([]);
	/** The photos currently crossing from the grid to the composer. */
	const [flights, setFlights] = useState<Flight[]>([]);

	const attach = useSharedValue(0);
	/** 0 no attachment strip → 1 strip open. */
	const strip = useSharedValue(0);

	const hasAttachments = attachments.length > 0;
	useEffect(() => {
		strip.set(withSpring(hasAttachments ? 1 : 0, SPRING.strip));
	}, [hasAttachments, strip]);

	// The hand-off, on one commit: the flying copies come off in the same
	// breath the composer's own thumbnails stop being held back.
	const settle = useCallback(() => {
		setFlights([]);
		onSettled?.();
		attach.set(0);
		resetPanel();
	}, [attach, onSettled, resetPanel]);

	/** Hands a set of photos to the composer and sends the sheet home. */
	const attachAndLeave = useCallback(
		(leaving: Flight[]) => {
			setFlights(leaving);
			setAttachments((prev) => [
				...prev,
				...leaving.map((flight) => flight.photo),
			]);
			collapsePanel();
			attach.set(
				withSpring(1, SPRING.attach, (finished) => {
					"worklet";
					if (finished) {
						scheduleOnRN(settle);
					}
				}),
			);
		},
		[attach, collapsePanel, settle],
	);

	const removeAttachment = useCallback((id: string) => {
		setAttachments((prev) => prev.filter((photo) => photo.id !== id));
	}, []);

	const clearAttachments = useCallback(() => setAttachments([]), []);

	return {
		attachments,
		flights,
		isFlying: flights.length > 0,
		attach,
		strip,
		attachAndLeave,
		removeAttachment,
		clearAttachments,
	};
}
