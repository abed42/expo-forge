import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { BOTTOM_BAR, type Frame, GRID, PANEL_CONTENT } from "../constants";
import { SheetPlaceholder } from "../panel/sheet-placeholder";
import { PhotoCell, slotSize } from "./photo-cell";
import type { LibraryPhoto, LibraryStatus } from "./use-photo-library";

interface PhotoGridProps {
	width: number;
	height: number;
	photos: LibraryPhoto[];
	status: LibraryStatus;
	/** Ids in tap order — the index inside drives the badge number. */
	selected: string[];
	/**
	 * True once the selected photos have left for the composer. Only the cells
	 * that left are cut; the rest of the grid is memoised past the commit.
	 */
	lifting: boolean;
	onTogglePhoto: (photo: LibraryPhoto) => void;
}

export interface PhotoGridHandle {
	/**
	 * Where a photo is sitting right now, in the grid's own coordinates, or
	 * null if the list has not laid that index out yet. Measured off the list
	 * rather than derived from the index.
	 */
	measureCell: (id: string) => Frame | null;
}

function placeholderFor(status: LibraryStatus) {
	if (status === "loading") {
		return "Loading photos…";
	}
	if (status === "empty") {
		return "No photos on this device.";
	}
	return "Photo access is off. Turn it on in Settings to attach photos.";
}

/**
 * Everything the panel shows once it has become the grid. Laid out at its
 * full on-screen size and then left alone: the panel scales this whole
 * subtree during the morph, so nothing in here knows a transition is happening.
 */
export const PhotoGrid = forwardRef<PhotoGridHandle, PhotoGridProps>(
	function PhotoGrid(
		{ width, height, photos, status, selected, lifting, onTogglePhoto },
		handle,
	) {
		const slot = slotSize(width);
		const listRef = useRef<FlashListRef<LibraryPhoto>>(null);

		useImperativeHandle(
			handle,
			() => ({
				measureCell: (id) => {
					const list = listRef.current;
					const index = photos.findIndex((photo) => photo.id === id);
					if (!list || index < 0) {
						return null;
					}
					const layout = list.getLayout(index);
					if (!layout) {
						return null;
					}
					// `getLayout` is in content coordinates; the scroll offset carries
					// the list's own leading inset, so the inset has to go back in to
					// land on a viewport position.
					const scrolled =
						list.getAbsoluteLastScrollOffset() - list.getFirstItemOffset();
					return {
						x: layout.x,
						y: layout.y - scrolled,
						// The cell is inset inside its slot on the right and bottom —
						// that hairline is the sheet showing through, not the photo.
						w: layout.width - GRID.gap,
						h: layout.height - GRID.gap,
					};
				},
			}),
			[photos],
		);

		return (
			<View style={[styles.root, { width, height }]}>
				{status === "ready" ? (
					<FlashList
						ref={listRef}
						data={photos}
						numColumns={GRID.columns}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<PhotoCell
								photo={item}
								slot={slot}
								order={selected.indexOf(item.id) + 1}
								lifted={lifting && selected.includes(item.id)}
								onPress={onTogglePhoto}
							/>
						)}
						extraData={`${selected.join()}|${lifting}`}
						// The keyboard is up the whole time this grid is on screen.
						// Without this the scroll view treats the first tap as
						// "dismiss the keyboard" and swallows it.
						keyboardShouldPersistTaps="always"
						keyboardDismissMode="none"
						// The bar floats over the grid, so the last row has to clear it.
						ListFooterComponent={<View style={styles.footer} />}
						showsVerticalScrollIndicator={false}
					/>
				) : (
					<SheetPlaceholder>{placeholderFor(status)}</SheetPlaceholder>
				)}
			</View>
		);
	},
);

const styles = StyleSheet.create({
	root: {
		...PANEL_CONTENT,
		// Deliberately no background: the panel's material shows through the
		// gutter and between the cells.
	},
	/** Lets the last row scroll clear of the floating bar. */
	footer: {
		height: BOTTOM_BAR.inset + BOTTOM_BAR.pillHeight + 24,
	},
});
