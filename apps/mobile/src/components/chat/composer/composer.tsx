import { Image } from "expo-image";
import { forwardRef, useEffect, useState } from "react";
import {
	Pressable,
	StyleSheet as RNStyleSheet,
	ScrollView,
	TextInput,
	type TextInput as TextInputType,
	View,
} from "react-native";
import Animated, {
	Extrapolation,
	FadeOut,
	interpolate,
	LinearTransition,
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { scheduleOnRN } from "react-native-worklets";

import {
	COMPOSER,
	COMPOSER_STRIP_HEIGHT,
	DURATION,
	GUTTER,
} from "../constants";
import { Glass } from "../glass";
import { Icon } from "../icon";
import type { LibraryPhoto } from "../photos/use-photo-library";

interface ThumbnailProps {
	photo: LibraryPhoto;
	/** Held back while a copy of this photo is still flying into this slot. */
	hidden: boolean;
	onRemove: (id: string) => void;
}

function Thumbnail({ photo, hidden, onRemove }: ThumbnailProps) {
	const { theme } = useUnistyles();
	return (
		// No entering animation: the flying copy is still standing in for this
		// slot, and the hand-off has to be a straight swap or the photo
		// double-exposes. Leaving fades in place while the rest close the gap.
		<Animated.View
			exiting={FadeOut.duration(DURATION.crossfade)}
			layout={LinearTransition.duration(DURATION.attach)}
			style={[styles.thumb, hidden && styles.thumbHidden]}
		>
			<Image
				source={photo.id}
				recyclingKey={photo.id}
				contentFit="cover"
				cachePolicy="memory-disk"
				style={RNStyleSheet.absoluteFill}
			/>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Remove attachment"
				hitSlop={10}
				onPress={() => onRemove(photo.id)}
				style={styles.remove}
			>
				<Icon name="close" size={11} color={theme.colors.chat.text} />
			</Pressable>
		</Animated.View>
	);
}

export interface ComposerProps {
	value: string;
	onChangeText: (text: string) => void;
	onSubmit: () => void;
	/** True while a reply is streaming: the action button becomes a stop. */
	busy: boolean;
	onStop: () => void;
	attachments: LibraryPhoto[];
	/**
	 * 0 no strip → 1 strip fully open. Owned by the screen rather than by this
	 * component: the panel flying in from the photo grid aims at a slot inside
	 * the strip, and that slot is still opening while it flies.
	 */
	strip: SharedValue<number>;
	/**
	 * 0 the + is in place → 1 it has cleared the space the panel opens on. It
	 * leads the panel in and trails it out, because the panel opens on top of
	 * this glyph and would otherwise hide the whole move.
	 */
	plusOut: SharedValue<number>;
	/** Ids of the attachments the flight is still standing in for. */
	pendingIds: string[];
	onPlusPress: () => void;
	onRemove: (id: string) => void;
}

/**
 * The composer. Its bottom edge is fixed — adding attachments grows it
 * upwards, which is what keeps the + button (and therefore the menu's anchor)
 * from moving.
 *
 * The bar is real glass on iOS 26; it is a container, not a control, so it is
 * not interactive — the surface under the text field has no business bulging
 * while it is typed into. It does not clip either: the action button's rim is
 * drawn outside its bounds.
 */
export const Composer = forwardRef<TextInputType, ComposerProps>(
	function Composer(
		{
			value,
			onChangeText,
			onSubmit,
			busy,
			onStop,
			attachments,
			strip,
			plusOut,
			pendingIds,
			onPlusPress,
			onRemove,
		},
		ref,
	) {
		const { theme } = useUnistyles();
		const hasAttachments = attachments.length > 0;
		const canSend = value.trim().length > 0 || hasAttachments;

		/**
		 * The + hands its place over to the menu about to grow out of it: right
		 * and out, and back the same way once the menu has gone. Only the glyph
		 * moves; the hit target stays put so the dismissing tap lands where the
		 * opening one did. The slide takes the spring raw, overshoot and all; the
		 * fade is clamped since a spring settles past 1.
		 */
		const plusStyle = useAnimatedStyle(() => ({
			opacity: interpolate(
				plusOut.get(),
				[0, 0.75],
				[1, 0],
				Extrapolation.CLAMP,
			),
			transform: [{ translateX: plusOut.get() * COMPOSER.plusSlide }],
		}));

		/**
		 * The strip has to outlive its last attachment: `attachments` empties on
		 * the tap, but the strip spends the next third of a second closing.
		 */
		const [retained, setRetained] = useState(attachments);
		useEffect(() => {
			if (hasAttachments) {
				setRetained(attachments);
			}
		}, [attachments, hasAttachments]);

		// Dropped once the strip is shut, not before: a spring lands exactly on
		// its target, so `=== 0` is the moment it is safe to unmount the photos.
		useAnimatedReaction(
			() => strip.get() === 0,
			(shut, wasShut) => {
				if (shut && wasShut === false) {
					scheduleOnRN(setRetained, [] as LibraryPhoto[]);
				}
			},
		);

		/**
		 * The strip's own height, clipped. Its contents keep their full size and
		 * are anchored to its top, so the photos rise out of the text row as it
		 * opens rather than squashing.
		 */
		const stripStyle = useAnimatedStyle(() => ({
			height: strip.get() * COMPOSER_STRIP_HEIGHT,
		}));

		const actionLabel = busy ? "Stop" : canSend ? "Send" : "Voice mode";
		const actionIcon = busy ? "stop" : canSend ? "send" : "voice";

		return (
			<Glass
				radius={COMPOSER.radius}
				interactive={false}
				// Below iOS 26 the bar keeps the flat surface it was measured at.
				fallbackTint={theme.colors.chat.surface}
				style={styles.root}
			>
				<Animated.View style={[styles.strip, stripStyle]}>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						keyboardShouldPersistTaps="always"
						keyboardDismissMode="none"
						style={styles.stripScroll}
						contentContainerStyle={styles.stripContent}
					>
						{retained.map((photo) => (
							<Thumbnail
								key={photo.id}
								photo={photo}
								hidden={pendingIds.includes(photo.id)}
								onRemove={onRemove}
							/>
						))}
					</ScrollView>
				</Animated.View>

				<View style={styles.row}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Add attachment"
						hitSlop={12}
						onPress={onPlusPress}
						style={styles.plus}
					>
						<Animated.View style={plusStyle}>
							<Icon
								name="plus"
								size={COMPOSER.plusSize}
								color={theme.colors.chat.text}
							/>
						</Animated.View>
					</Pressable>

					<TextInput
						ref={ref}
						value={value}
						onChangeText={onChangeText}
						onSubmitEditing={onSubmit}
						blurOnSubmit={false}
						returnKeyType="send"
						enablesReturnKeyAutomatically
						placeholder="Message"
						placeholderTextColor={theme.colors.chat.placeholder}
						// The keyboard is what the sheet's material samples for most of
						// its height, so a light keyboard turns the whole sheet grey.
						keyboardAppearance="dark"
						multiline={false}
						style={styles.field}
					/>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Dictate"
						hitSlop={10}
					>
						<Icon
							name="mic"
							size={COMPOSER.micSize}
							color={theme.colors.chat.text}
						/>
					</Pressable>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel={actionLabel}
						onPress={busy ? onStop : canSend ? onSubmit : undefined}
						style={styles.action}
					>
						<Icon
							name={actionIcon}
							size={busy ? 14 : 18}
							color={theme.colors.chat.background}
						/>
					</Pressable>
				</View>
			</Glass>
		);
	},
);

const styles = StyleSheet.create((theme) => ({
	root: {
		marginHorizontal: GUTTER,
	},
	strip: {
		// The clip lives here rather than on the bar so no glass sits under an
		// `overflow: hidden`; the radius is the bar's own, pulled in by the
		// strip's inset so the two curves stay concentric.
		overflow: "hidden",
		borderTopLeftRadius: COMPOSER.radius - COMPOSER.stripPaddingTop,
		borderTopRightRadius: COMPOSER.radius - COMPOSER.stripPaddingTop,
		borderCurve: "continuous",
	},
	stripScroll: {
		// Pinned to the top of the clip at its full open height, so a half-open
		// strip shows the top of the photos rather than a squashed copy.
		position: "absolute",
		left: 0,
		right: 0,
		top: COMPOSER.stripPaddingTop,
		height: COMPOSER.thumbSize,
	},
	stripContent: {
		paddingLeft: COMPOSER.stripPaddingTop,
		gap: COMPOSER.thumbGap,
	},
	thumb: {
		width: COMPOSER.thumbSize,
		height: COMPOSER.thumbSize,
		borderRadius: COMPOSER.thumbRadius,
		borderCurve: "continuous",
		overflow: "hidden",
		backgroundColor: theme.colors.chat.photoFill,
	},
	thumbHidden: {
		opacity: 0,
	},
	row: {
		height: COMPOSER.rowHeight,
		flexDirection: "row",
		alignItems: "center",
		// Shared with the panel: these two put the + glyph's centre at
		// `PLUS_CENTER_X`, which is where the menu grows out of.
		paddingLeft: COMPOSER.rowPaddingLeft,
		paddingRight: 9,
		gap: 10,
	},
	plus: {
		width: COMPOSER.plusHit,
		alignItems: "center",
	},
	field: {
		flex: 1,
		color: theme.colors.chat.text,
		fontSize: COMPOSER.fieldSize,
		padding: 0,
	},
	remove: {
		position: "absolute",
		top: COMPOSER.removeBadgeInset,
		right: COMPOSER.removeBadgeInset,
		width: COMPOSER.removeBadge,
		height: COMPOSER.removeBadge,
		borderRadius: COMPOSER.removeBadge / 2,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: theme.colors.chat.removeScrim,
	},
	action: {
		// Solid white, not glass: the one control in the bar that has to read
		// as the primary action, whatever it happens to be sitting over.
		width: COMPOSER.actionSize,
		height: COMPOSER.actionSize,
		borderRadius: COMPOSER.actionSize / 2,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: theme.colors.chat.text,
	},
}));
