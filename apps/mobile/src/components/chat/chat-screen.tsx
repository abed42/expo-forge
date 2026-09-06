import type { CameraType, FlashMode } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Pressable,
	StyleSheet as RNStyleSheet,
	ScrollView,
	Text,
	type TextInput,
	View,
} from "react-native";
import { OverKeyboardView } from "react-native-keyboard-controller";
import Animated, {
	FadeIn,
	FadeInDown,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CameraBar } from "./camera/camera-bar";
import { CameraSheet, type CameraSheetHandle } from "./camera/camera-sheet";
import { AttachmentFlight } from "./composer/attachment-flight";
import { Composer } from "./composer/composer";
import {
	COMPOSER,
	COMPOSER_STRIP_HEIGHT,
	DURATION,
	GRID,
	GUTTER,
	sheetTopFromComposerBottom,
} from "./constants";
import { Icon } from "./icon";
import { AttachmentMenu } from "./panel/attachment-menu";
import { AttachmentPanel } from "./panel/attachment-panel";
import { PhotoGrid, type PhotoGridHandle } from "./photos/photo-grid";
import { PhotoGridBar } from "./photos/photo-grid-bar";
import { type LibraryPhoto, usePhotoLibrary } from "./photos/use-photo-library";
import { useAttachmentFlights } from "./use-attachment-flights";
import { useAttachmentPanel } from "./use-attachment-panel";
import { type ChatMessage, useMockChat } from "./use-mock-chat";
import { useSheetGeometry } from "./use-sheet-geometry";

/** Starter prompts, shown above the composer until the first message. */
const SUGGESTIONS = [
	"Explain optimistic UI",
	"Write a haiku about Swift",
	"What is Liquid Glass?",
];

/**
 * The chat tab: a streamed mock thread over the ChatGPT composer and its
 * attachment sheet. Must render inside a `KeyboardProvider` — the route file
 * wraps it — because the sheet is hosted over the keyboard.
 */
export function ChatScreen() {
	const { theme } = useUnistyles();
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const {
		width,
		height,
		sheetFloor,
		liftedBy,
		composerBottom,
		composerStyle,
		gridWidth,
		gridHeight,
	} = useSheetGeometry();
	const chat = useMockChat();

	const inputRef = useRef<TextInput>(null);
	const scrollRef = useRef<ScrollView>(null);
	const gridRef = useRef<PhotoGridHandle>(null);
	const cameraRef = useRef<CameraSheetHandle>(null);

	const [draft, setDraft] = useState("");
	const [facing, setFacing] = useState<CameraType>("back");
	const [flash, setFlash] = useState<FlashMode>("off");
	/** True from the shutter tap until the capture is in hand — one at a time. */
	const capturing = useRef(false);
	const [selected, setSelected] = useState<string[]>([]);
	const clearSelection = useCallback(() => setSelected([]), []);

	const panel = useAttachmentPanel({ onLeaveSheet: clearSelection });
	// Latched: once the grid has been opened the library stays loaded, so the
	// second opening doesn't start from an empty sheet.
	const [libraryWanted, setLibraryWanted] = useState(false);
	if (panel.sheet === "photos" && !libraryWanted) {
		setLibraryWanted(true);
	}
	const { photos, status } = usePhotoLibrary(libraryWanted);
	const {
		attachments,
		flights,
		isFlying,
		attach,
		strip,
		attachAndLeave,
		removeAttachment,
		clearAttachments,
	} = useAttachmentFlights({
		collapsePanel: panel.collapseForLeave,
		resetPanel: panel.resetAfterLeave,
		onSettled: clearSelection,
	});

	const showSuggestions = chat.messages.length === 0;

	/**
	 * The suggestion rows go where the strip comes from, so they leave as it
	 * arrives. Measured rather than assumed: text is the one thing here whose
	 * height is not ours to decide.
	 */
	const [suggestionsHeight, setSuggestionsHeight] = useState(0);
	const suggestionsStyle = useAnimatedStyle(() => ({
		height: (1 - strip.get()) * suggestionsHeight,
		opacity: 1 - strip.get(),
	}));

	// The thread scrolls above the composer, which floats: pad its end by the
	// composer's live height so the last message always clears it.
	const threadEndStyle = useAnimatedStyle(() => ({
		height:
			liftedBy.get() +
			COMPOSER.rowHeight +
			strip.get() * COMPOSER_STRIP_HEIGHT +
			(1 - strip.get()) * suggestionsHeight +
			GUTTER,
	}));

	// The menu's anchor is measured against the keyboard, so bring it up on
	// arrival. The tab mounts lazily, so this runs on the first visit.
	useEffect(() => {
		const timer = setTimeout(() => inputRef.current?.focus(), 350);
		return () => clearTimeout(timer);
	}, []);

	const send = useCallback(() => {
		if (chat.send(draft, attachments)) {
			setDraft("");
			clearAttachments();
		}
	}, [attachments, chat.send, clearAttachments, draft]);

	const togglePhoto = useCallback((photo: LibraryPhoto) => {
		Haptics.selectionAsync();
		setSelected((prev) =>
			prev.includes(photo.id)
				? prev.filter((id) => id !== photo.id)
				: [...prev, photo.id],
		);
	}, []);

	const confirmSelection = useCallback(() => {
		const picked = selected
			.map((id) => photos.find((photo) => photo.id === id))
			.filter((photo): photo is LibraryPhoto => !!photo)
			// The same photo can be picked twice across two visits. Its id is
			// the strip's React key, and two rows under one key breaks their
			// layout animations — the second copy simply isn't attached.
			.filter(
				(photo) => !attachments.some((existing) => existing.id === photo.id),
			);
		if (!picked.length) {
			return;
		}
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		// Where each photo is sitting, right now, on the frame it leaves. The
		// panel is at rest and fully morphed here, so its own frame is the
		// offset from the window — no measure pass.
		const gridTop = sheetTopFromComposerBottom(
			composerBottom.get(),
			sheetFloor,
		);
		// Only for a photo the list has not laid out — one scrolled far enough
		// out that it has no frame to leave from. The middle of the sheet is
		// where the sheet is collapsing towards.
		const cellSize = gridWidth / GRID.columns - GRID.gap;
		const fallback = {
			x: GUTTER + (gridWidth - cellSize) / 2,
			y: gridTop + (gridHeight - cellSize) / 2,
			w: cellSize,
			h: cellSize,
		};

		const base = attachments.length;
		attachAndLeave(
			picked.map((photo, index) => {
				const cell = gridRef.current?.measureCell(photo.id);
				return {
					photo,
					slot: base + index,
					from: cell
						? { x: GUTTER + cell.x, y: gridTop + cell.y, w: cell.w, h: cell.h }
						: fallback,
				};
			}),
		);
	}, [
		attachAndLeave,
		attachments,
		composerBottom,
		gridHeight,
		gridWidth,
		photos,
		selected,
		sheetFloor,
	]);

	/**
	 * The shutter. The picture leaves as the whole sheet: the preview's rect,
	 * with the sheet's own corners, shrinking into the thumbnail's slot the
	 * same way a grid cell does.
	 */
	const capturePhoto = useCallback(async () => {
		if (capturing.current) {
			return;
		}
		capturing.current = true;
		try {
			const uri = await cameraRef.current?.takePicture();
			if (!uri) {
				return;
			}
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

			const sheetTop = sheetTopFromComposerBottom(
				composerBottom.get(),
				sheetFloor,
			);
			attachAndLeave([
				{
					photo: { id: uri },
					slot: attachments.length,
					from: { x: GUTTER, y: sheetTop, w: gridWidth, h: gridHeight },
					fromRadius: GRID.panelRadius,
				},
			]);
		} finally {
			capturing.current = false;
		}
	}, [
		attachAndLeave,
		attachments.length,
		composerBottom,
		gridHeight,
		gridWidth,
		sheetFloor,
	]);

	const flipCamera = useCallback(() => {
		Haptics.selectionAsync();
		setFacing((was) => (was === "back" ? "front" : "back"));
	}, []);

	const toggleFlash = useCallback(() => {
		Haptics.selectionAsync();
		setFlash((was) => (was === "off" ? "on" : "off"));
	}, []);

	const subtitle = chat.isThinking
		? "Thinking…"
		: chat.isStreaming
			? "Responding…"
			: "Mock model";

	return (
		<View style={styles.screen}>
			<View style={[styles.topBar, { paddingTop: insets.top + theme.gap(1) }]}>
				<Pressable
					accessibilityLabel="Back"
					accessibilityRole="button"
					hitSlop={10}
					onPress={() => router.back()}
					style={styles.topBarButton}
				>
					<Icon name="chevron-left" size={20} color={theme.colors.chat.text} />
				</Pressable>
				<View style={styles.topBarTitle}>
					<Text style={styles.title}>Assistant</Text>
					<Text style={styles.subtitle}>{subtitle}</Text>
				</View>
				<Pressable
					accessibilityLabel="New conversation"
					accessibilityRole="button"
					hitSlop={10}
					onPress={() => {
						chat.reset();
						setDraft("");
						clearAttachments();
					}}
					style={styles.topBarButton}
				>
					<Icon name="compose" size={20} color={theme.colors.chat.text} />
				</Pressable>
			</View>

			<ScrollView
				contentContainerStyle={styles.thread}
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled"
				onContentSizeChange={() =>
					scrollRef.current?.scrollToEnd({ animated: true })
				}
				ref={scrollRef}
				style={styles.flex}
			>
				{showSuggestions ? (
					<Animated.View entering={FadeIn.duration(300)} style={styles.empty}>
						<Icon name="sparkles" size={28} color={theme.colors.chat.text} />
						<Text style={styles.emptyTitle}>Ask anything</Text>
						<Text style={styles.emptyBody}>
							Streamed responses, an interruptible reply, and photos that fly
							from the picker into the composer.
						</Text>
					</Animated.View>
				) : null}

				{chat.messages.map((message) => (
					<MessageRow key={message.id} message={message} />
				))}

				<Animated.View style={threadEndStyle} />
			</ScrollView>

			<Animated.View style={[styles.bottom, composerStyle]}>
				{showSuggestions ? (
					<Animated.View
						pointerEvents={isFlying ? "none" : "box-none"}
						style={[styles.suggestions, suggestionsStyle]}
					>
						<View
							onLayout={(event) =>
								setSuggestionsHeight(event.nativeEvent.layout.height)
							}
							style={styles.suggestionsContent}
						>
							{SUGGESTIONS.map((label) => (
								<Pressable
									key={label}
									accessibilityRole="button"
									onPress={() => chat.send(label)}
									style={({ pressed }) => [
										styles.suggestion,
										pressed && styles.pressed,
									]}
								>
									<View style={styles.suggestionDot} />
									<Text style={styles.suggestionLabel}>{label}</Text>
								</Pressable>
							))}
						</View>
					</Animated.View>
				) : null}

				<Composer
					ref={inputRef}
					value={draft}
					onChangeText={setDraft}
					onSubmit={send}
					busy={chat.isBusy}
					onStop={chat.stop}
					attachments={attachments}
					strip={strip}
					// Drives the + glyph out of the menu's way, a beat ahead of it.
					plusOut={panel.plusOut}
					// The composer's own thumbnails stay blank until the flying copies
					// finish landing on them, so a photo is never on screen twice.
					pendingIds={flights.map((flight) => flight.photo.id)}
					onPlusPress={panel.onPlusPress}
					onRemove={removeAttachment}
				/>
			</Animated.View>

			{/* The sheet overlaps the keyboard by design — the menu's bottom two
			    rows sit over it — so it has to be hosted in the window above it. */}
			<OverKeyboardView visible={panel.mode !== "closed"}>
				{panel.mode !== "closed" ? (
					// Nothing in here takes a touch once the photos are on their way:
					// a tap on the backdrop would start a second close on top of
					// this one.
					<View
						pointerEvents={isFlying ? "none" : "box-none"}
						style={RNStyleSheet.absoluteFill}
					>
						<Pressable
							accessibilityLabel="Close attachment menu"
							onPress={panel.dismiss}
							style={RNStyleSheet.absoluteFill}
						/>
						<AttachmentPanel
							screenHeight={height}
							sheetFloor={sheetFloor}
							gridWidth={gridWidth}
							gridHeight={gridHeight}
							interactive={
								isFlying ? "none" : panel.mode === "menu" ? "menu" : "grid"
							}
							// The material is the panel's, not the menu's: it stays on
							// through the morph and goes only once the sheet is leaving.
							glass={!panel.closing}
							glassDuration={DURATION.panel / 1000}
							open={panel.open}
							morph={panel.morph}
							menuOpacity={panel.menuOpacity}
							gridOpacity={panel.gridOpacity}
							blur={panel.blur}
							composerBottom={composerBottom}
							menu={<AttachmentMenu onSelect={panel.onMenuAction} />}
							grid={
								panel.sheet === "camera" ? (
									<CameraSheet
										ref={cameraRef}
										width={gridWidth}
										height={gridHeight}
										facing={facing}
										flash={flash}
										lifting={isFlying}
									/>
								) : (
									<PhotoGrid
										ref={gridRef}
										width={gridWidth}
										height={gridHeight}
										photos={photos}
										status={status}
										selected={selected}
										lifting={isFlying}
										onTogglePhoto={togglePhoto}
									/>
								)
							}
						/>

						{/* The floating controls live beside the panel, not inside it:
						    glass anywhere below the panel's animated layers comes out
						    flat. */}
						{panel.sheet === "camera" ? (
							<CameraBar
								width={gridWidth}
								active={panel.mode === "camera" && !isFlying}
								fade={panel.gridOpacity}
								flash={flash}
								onBack={panel.backToMenu}
								onCapture={capturePhoto}
								onFlip={flipCamera}
								onToggleFlash={toggleFlash}
							/>
						) : (
							<PhotoGridBar
								width={gridWidth}
								selected={selected}
								active={panel.mode === "photos" && !isFlying}
								fade={panel.gridOpacity}
								onBack={panel.backToMenu}
								onConfirm={confirmSelection}
							/>
						)}

						{/* Above the sheet, and outside its clip: the photos have left
						    it, and the last third of the way is over the composer. */}
						<AttachmentFlight
							flights={flights}
							screenWidth={width}
							attach={attach}
							strip={strip}
							composerBottom={composerBottom}
						/>
					</View>
				) : null}
			</OverKeyboardView>
		</View>
	);
}

function MessageRow({ message }: { message: ChatMessage }) {
	const { theme } = useUnistyles();

	if (message.role === "user") {
		return (
			<Animated.View entering={FadeInDown.duration(220)} style={styles.userRow}>
				{message.attachments?.length ? (
					<View style={styles.sentPhotos}>
						{message.attachments.map((photo) => (
							<Image
								key={photo.id}
								source={photo.id}
								recyclingKey={photo.id}
								contentFit="cover"
								cachePolicy="memory-disk"
								style={styles.sentPhoto}
							/>
						))}
					</View>
				) : null}
				{message.text ? (
					<View style={styles.userBubble}>
						<Text style={styles.userText}>{message.text}</Text>
					</View>
				) : null}
			</Animated.View>
		);
	}

	return (
		<Animated.View entering={FadeIn.duration(220)} style={styles.assistantRow}>
			{message.text ? (
				<Text style={styles.assistantText}>{message.text}</Text>
			) : (
				<ThinkingDots color={theme.colors.chat.placeholder} />
			)}
		</Animated.View>
	);
}

// Three-dot placeholder held until the first token lands.
function ThinkingDots({ color }: { color: string }) {
	const [step, setStep] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => setStep((value) => (value + 1) % 4), 320);
		return () => clearInterval(timer);
	}, []);

	return (
		<Text style={[styles.assistantText, { color }]}>
			{".".repeat(step === 0 ? 1 : step)}
		</Text>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		flex: 1,
		backgroundColor: theme.colors.chat.background,
	},
	flex: {
		flex: 1,
	},
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: theme.gap(2),
		paddingBottom: theme.gap(1.5),
	},
	topBarTitle: {
		flex: 1,
		alignItems: "center",
	},
	topBarButton: {
		width: 32,
		alignItems: "flex-end",
	},
	title: {
		...theme.type.body,
		color: theme.colors.chat.text,
		fontWeight: "600",
	},
	subtitle: {
		...theme.type.caption,
		color: theme.colors.chat.placeholder,
	},
	thread: {
		gap: theme.gap(2),
		paddingHorizontal: theme.gap(2.5),
		paddingTop: theme.gap(1),
	},
	empty: {
		alignItems: "center",
		gap: theme.gap(1),
		paddingTop: theme.gap(6),
	},
	emptyTitle: {
		...theme.type.title,
		color: theme.colors.chat.text,
	},
	emptyBody: {
		...theme.type.body,
		color: theme.colors.chat.placeholder,
		textAlign: "center",
	},
	userRow: {
		alignItems: "flex-end",
		gap: theme.gap(1),
	},
	sentPhotos: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "flex-end",
		gap: COMPOSER.thumbGap,
		maxWidth: "85%",
	},
	sentPhoto: {
		width: COMPOSER.thumbSize,
		height: COMPOSER.thumbSize,
		borderRadius: COMPOSER.thumbRadius,
		borderCurve: "continuous",
		backgroundColor: theme.colors.chat.photoFill,
	},
	userBubble: {
		backgroundColor: theme.colors.chat.surface,
		borderCurve: "continuous",
		borderRadius: theme.radius.card,
		maxWidth: "85%",
		paddingHorizontal: theme.gap(2),
		paddingVertical: theme.gap(1.25),
	},
	userText: {
		...theme.type.body,
		color: theme.colors.chat.text,
	},
	assistantRow: {
		paddingRight: theme.gap(2),
	},
	assistantText: {
		...theme.type.body,
		color: theme.colors.chat.text,
	},
	bottom: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
	},
	suggestions: {
		// Clipped so the rows are eaten by the composer growing into them
		// rather than squashed. `suggestionsContent` keeps its own height.
		overflow: "hidden",
	},
	suggestionsContent: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		paddingHorizontal: GUTTER + 16,
		paddingBottom: 18,
		gap: 18,
	},
	suggestion: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	suggestionDot: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: theme.colors.chat.suggestionDot,
	},
	suggestionLabel: {
		color: theme.colors.chat.text,
		fontSize: 17,
	},
	pressed: {
		opacity: 0.6,
	},
}));
