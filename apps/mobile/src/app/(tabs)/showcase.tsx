import {
	BottomSheet,
	ContextMenu,
	Group,
	Host,
	HStack,
	Menu,
	Picker,
	Button as SwiftButton,
	Image as SwiftImage,
	Text as SwiftText,
	VStack,
} from "@expo/ui/swift-ui";
import {
	background,
	buttonStyle,
	fixedSize,
	font,
	foregroundColor,
	frame,
	glassEffect,
	onTapGesture,
	padding,
	pickerStyle,
	presentationDetents,
	presentationDragIndicator,
	shapes,
	tag,
	tint,
} from "@expo/ui/swift-ui/modifiers";
import { Button, Chip, IconButton } from "@repo/design-system";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
	ActionSheetIOS,
	Alert,
	Image,
	Platform,
	Pressable,
	ScrollView,
	Share,
	Text,
	View,
} from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeOut,
	LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

// Gate required: some iOS 26 builds lack the API and crash without it.
const canUseGlass = isLiquidGlassAvailable();
const isIOS = Platform.OS === "ios";

// expo-maps is a native module — it exists only in dev clients built after it
// was added. Resolve lazily so this route still renders on older binaries
// (the Map segment falls back to the placeholder card).
const appleMaps: typeof import("expo-maps").AppleMaps | null = (() => {
	if (!isIOS) {
		return null;
	}
	try {
		return require("expo-maps").AppleMaps;
	} catch {
		return null;
	}
})();

const FILTERS = [
	{ count: 4, key: "all", label: "All" },
	{ count: 2, key: "popular", label: "Popular" },
	{ count: 2, key: "recent", label: "Recent" },
	{ count: 1, key: "saved", label: "Saved" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

// Mock results behind the filter row — swapping filters reflows the list
// with a Reanimated layout transition (flightly's SearchFieldRow pattern).
const FILTER_ITEMS: Record<FilterKey, readonly string[]> = {
	all: ["Aurora", "Basalt", "Cinder", "Dune"],
	popular: ["Aurora", "Cinder"],
	recent: ["Cinder", "Dune"],
	saved: ["Basalt"],
};

// Coordinates for the Map segment — each mock item gets a real place.
const ITEM_PINS: Record<string, { latitude: number; longitude: number }> = {
	Aurora: { latitude: 64.15, longitude: -21.94 },
	Basalt: { latitude: 55.24, longitude: -6.51 },
	Cinder: { latitude: 35.2, longitude: -111.65 },
	Dune: { latitude: 31.1, longitude: -4.01 },
};

const SEGMENTS = ["List", "Grid", "Map"] as const;

const MENU_ACTIONS = ["Share", "Duplicate", "Delete"] as const;

const CONTEXT_ACTIONS = [
	{ icon: "pin", label: "Pin", role: "default" },
	{ icon: "pencil", label: "Rename", role: "default" },
	{ icon: "trash", label: "Delete", role: "destructive" },
] as const;

function TileLabel({ children }: { children: string }) {
	return <Text style={styles.tileLabel}>{children}</Text>;
}

// Pill button matching the template's fill/pressed conventions — used where a
// native SwiftUI control isn't available (Android, pre-glass iOS).
function PillButton({
	label,
	onPress,
}: {
	label: string;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [
				styles.pill,
				pressed ? styles.pillPressed : null,
			]}
		>
			<Text style={styles.pillLabel}>{label}</Text>
		</Pressable>
	);
}

export default function ShowcaseScreen() {
	const router = useRouter();
	const { theme } = useUnistyles();
	const insets = useSafeAreaInsets();

	const [filter, setFilter] = useState<FilterKey>("all");
	const [segment, setSegment] = useState(0);
	const [lastAction, setLastAction] = useState<string | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [liked, setLiked] = useState(false);
	const [subscribed, setSubscribed] = useState(false);
	const [sparkle, setSparkle] = useState(0);

	const activeFilter = FILTERS.find((entry) => entry.key === filter);

	const openActionSheet = () => {
		if (isIOS) {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					cancelButtonIndex: MENU_ACTIONS.length,
					destructiveButtonIndex: MENU_ACTIONS.indexOf("Delete"),
					options: [...MENU_ACTIONS, "Cancel"],
				},
				(index) => {
					const action = MENU_ACTIONS[index];
					if (action) {
						setLastAction(action);
					}
				},
			);
			return;
		}
		Alert.alert(
			"Actions",
			undefined,
			MENU_ACTIONS.map((action) => ({
				onPress: () => setLastAction(action),
				text: action,
			})),
		);
	};

	const openAlert = () => {
		Alert.alert("Delete item?", "This is the confirm-dialog pattern.", [
			{ style: "cancel", text: "Cancel" },
			{
				onPress: () => setLastAction("Delete"),
				style: "destructive",
				text: "Delete",
			},
		]);
	};

	// Android fallback for the native SwiftUI dropdown menu.
	const openMenuFallback = () => {
		Alert.alert(
			"Menu",
			undefined,
			MENU_ACTIONS.map((action) => ({
				onPress: () => setLastAction(action),
				text: action,
			})),
		);
	};

	return (
		<View style={styles.screen}>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					isIOS ? null : { paddingTop: insets.top + theme.gap(2) },
				]}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.titleBlock}>
					<Text style={styles.title}>Showcase</Text>
					<Text style={styles.subtitle}>
						The template's UI kit — glass, drawers, pop-ups, filters, and
						buttons, all on system APIs.
					</Text>
				</View>

				{/* Glass demo — the capsule is real system glass; the bold word
				    behind it makes the blur/refraction visible in both themes.
				    Tapping the capsule swaps the regular/clear material variants. */}
				<Animated.View
					entering={FadeInDown.duration(350)}
					style={styles.tileHero}
				>
					<View pointerEvents="none" style={styles.heroBackdrop}>
						<Image
							resizeMode="contain"
							source={require("../../../assets/images/expo-forge-lockup.png")}
							style={styles.heroLogo}
						/>
					</View>
					{canUseGlass ? (
						<Pressable
							accessibilityRole="button"
							onPress={() => {
								setSparkle((value) => value + 1);
								setLastAction("Liquid Glass");
							}}
						>
							<GlassView
								glassEffectStyle="regular"
								isInteractive
								style={styles.heroCapsule}
							>
								<SymbolView
									animationSpec={{ effect: { type: "bounce" } }}
									key={`sparkle-${sparkle}`}
									name="sparkles"
									size={17}
									tintColor={theme.colors.ink}
								/>
								<Text style={styles.heroCapsuleLabel}>Liquid Glass</Text>
							</GlassView>
						</Pressable>
					) : (
						<View style={[styles.heroCapsule, styles.heroCapsuleFallback]}>
							<SymbolView
								name="sparkles"
								size={17}
								tintColor={theme.colors.ink}
							/>
							<Text style={styles.heroCapsuleLabel}>Liquid Glass</Text>
						</View>
					)}
					<Text style={styles.heroCaption}>
						{canUseGlass
							? "Real Liquid Glass, native SwiftUI — tap it"
							: "Fill fallback — glass needs iOS 26"}
					</Text>
				</Animated.View>

				{/* Drawers + long-press context menu */}
				<Animated.View
					entering={FadeInDown.duration(350).delay(60)}
					style={styles.stack}
				>
					<View style={styles.tile}>
						<TileLabel>Drawers</TileLabel>
						<Text style={styles.tileBody}>
							Native sheets with detents — drag between half and full height.
						</Text>
						<PillButton
							label="Form sheet"
							onPress={() => router.push("/showcase-sheet")}
						/>
						{isIOS ? (
							<PillButton
								label="Bottom sheet"
								onPress={() => setSheetOpen(true)}
							/>
						) : null}
					</View>
					<View style={styles.tile}>
						<TileLabel>Context menu</TileLabel>
						{isIOS ? (
							<Host style={styles.contextHost}>
								<ContextMenu>
									<ContextMenu.Items>
										{CONTEXT_ACTIONS.map((item) => (
											<SwiftButton
												key={item.label}
												label={item.label}
												onPress={() => setLastAction(item.label)}
												role={item.role}
												systemImage={item.icon}
											/>
										))}
									</ContextMenu.Items>
									<ContextMenu.Trigger>
										<VStack
											alignment="center"
											modifiers={[
												// Fill the Host so the card spans the tile and the
												// tile padding reads as an even margin.
												frame({ maxHeight: 9999, maxWidth: 9999 }),
												background(
													theme.colors.surface,
													shapes.roundedRectangle({
														cornerRadius: 12,
														roundedCornerStyle: "continuous",
													}),
												),
											]}
											spacing={8}
										>
											<SwiftImage
												color={theme.colors.ink}
												size={22}
												systemName="hand.tap"
											/>
											<SwiftText
												modifiers={[
													font({ size: 13 }),
													foregroundColor(theme.colors.secondary),
												]}
											>
												Tap and hold
											</SwiftText>
										</VStack>
									</ContextMenu.Trigger>
								</ContextMenu>
							</Host>
						) : (
							<Pressable
								onLongPress={openMenuFallback}
								style={({ pressed }) => [
									styles.holdCard,
									pressed ? styles.pillPressed : null,
								]}
							>
								<Text style={styles.tileCaption}>Tap and hold</Text>
							</Pressable>
						)}
					</View>
				</Animated.View>

				<Animated.View
					entering={FadeInDown.duration(350).delay(120)}
					style={styles.stack}
				>
					{/* Buttons */}
					<View style={styles.tile}>
						<TileLabel>Buttons</TileLabel>
						{isIOS && canUseGlass ? (
							<Host style={styles.buttonHost}>
								<SwiftButton
									label="Primary"
									modifiers={[
										buttonStyle("glassProminent"),
										tint(theme.colors.ink),
										foregroundColor(theme.colors.onInk),
										frame({ height: 44, maxWidth: 9999 }),
									]}
									onPress={() => setLastAction("Primary")}
								/>
							</Host>
						) : (
							<Button
								label="Primary"
								onPress={() => setLastAction("Primary")}
							/>
						)}
						{isIOS && canUseGlass ? (
							<Host style={styles.buttonHost}>
								<SwiftButton
									label="Glass button"
									modifiers={[
										buttonStyle("glass"),
										frame({ height: 44, maxWidth: 9999 }),
									]}
									onPress={() => setLastAction("Glass button")}
								/>
							</Host>
						) : (
							<PillButton
								label="Glass button"
								onPress={() => setLastAction("Glass button")}
							/>
						)}
						<View style={styles.iconRow}>
							<IconButton
								accessibilityLabel="Like"
								glass
								onPress={() => {
									setLiked((value) => !value);
									setLastAction("Like");
								}}
							>
								<SymbolView
									animationSpec={{ effect: { type: "bounce" } }}
									key={liked ? "heart-on" : "heart-off"}
									name={liked ? "heart.fill" : "heart"}
									size={17}
									tintColor={theme.colors.ink}
								/>
							</IconButton>
							<IconButton
								accessibilityLabel="Share"
								glass
								onPress={() => {
									setLastAction("Share");
									void Share.share({ message: "Built with expo-forge" });
								}}
							>
								<SymbolView
									name="square.and.arrow.up"
									size={17}
									tintColor={theme.colors.ink}
								/>
							</IconButton>
							<IconButton
								accessibilityLabel="Notify"
								glass
								onPress={() => {
									setSubscribed((value) => !value);
									setLastAction("Notify");
								}}
							>
								<SymbolView
									animationSpec={{ effect: { type: "bounce" } }}
									key={subscribed ? "bell-on" : "bell-off"}
									name={subscribed ? "bell.fill" : "bell"}
									size={17}
									tintColor={theme.colors.ink}
								/>
							</IconButton>
						</View>
					</View>

					{/* Pop-ups */}
					<View style={styles.tile}>
						<TileLabel>Pop-ups</TileLabel>
						{isIOS ? (
							<Host style={styles.buttonHost}>
								<Menu
									label="Menu"
									modifiers={[
										canUseGlass
											? buttonStyle("glass")
											: buttonStyle("bordered"),
										frame({ height: 44 }),
									]}
									systemImage="ellipsis.circle"
								>
									{MENU_ACTIONS.map((action) => (
										<SwiftButton
											key={action}
											label={action}
											onPress={() => setLastAction(action)}
											role={action === "Delete" ? "destructive" : "default"}
											systemImage={
												action === "Share"
													? "square.and.arrow.up"
													: action === "Duplicate"
														? "doc.on.doc"
														: "trash"
											}
										/>
									))}
								</Menu>
							</Host>
						) : (
							<PillButton label="Menu" onPress={openMenuFallback} />
						)}
						<PillButton label="Action sheet" onPress={openActionSheet} />
						<PillButton label="Alert" onPress={openAlert} />
						<Text style={styles.tileCaption}>
							{lastAction ? `Last: ${lastAction}` : "Nothing picked yet"}
						</Text>
					</View>
				</Animated.View>

				{/* Filters */}
				<Animated.View
					entering={FadeInDown.duration(350).delay(180)}
					style={styles.tile}
				>
					<TileLabel>Filters</TileLabel>
					{isIOS && canUseGlass ? (
						// Flightly's chip pattern: the selected chip carries a glass
						// capsule; unselected chips are bare text.
						<Host style={styles.chipHost}>
							{/* frame(alignment: leading) pins the row to the left edge —
							    without it SwiftUI centers the stack until first re-layout. */}
							<HStack
								modifiers={[frame({ alignment: "leading", maxWidth: 9999 })]}
								spacing={4}
							>
								{FILTERS.map((entry) => (
									<SwiftText
										key={entry.key}
										modifiers={[
											// fixedSize stops SwiftUI from ellipsizing labels
											// when the row is tight.
											fixedSize(),
											font({ size: 14, weight: "semibold" }),
											foregroundColor(
												filter === entry.key
													? theme.colors.ink
													: theme.colors.secondary,
											),
											padding({ horizontal: 10, vertical: 10 }),
											...(filter === entry.key
												? [
														glassEffect({
															glass: {
																interactive: true,
																variant: "regular",
															},
															shape: "capsule",
														}),
													]
												: []),
											onTapGesture(() => setFilter(entry.key)),
										]}
									>
										{`${entry.label} ${entry.count}`}
									</SwiftText>
								))}
							</HStack>
						</Host>
					) : (
						<View style={styles.chipRow}>
							{FILTERS.map((entry) => (
								<Chip
									count={entry.count}
									key={entry.key}
									label={entry.label}
									onPress={() => setFilter(entry.key)}
									selected={filter === entry.key}
								/>
							))}
						</View>
					)}
					{isIOS ? (
						<Host style={styles.segmentHost}>
							<Picker
								modifiers={[pickerStyle("segmented")]}
								onSelectionChange={(selection) => setSegment(selection)}
								selection={segment}
							>
								{SEGMENTS.map((label, index) => (
									<SwiftText key={label} modifiers={[tag(index)]}>
										{label}
									</SwiftText>
								))}
							</Picker>
						</Host>
					) : (
						<View style={styles.chipRow}>
							{SEGMENTS.map((label, index) => (
								<Chip
									key={label}
									label={label}
									onPress={() => setSegment(index)}
									selected={segment === index}
								/>
							))}
						</View>
					)}
					<Animated.View
						layout={LinearTransition.duration(220)}
						style={styles.resultList}
					>
						{segment === 2 ? (
							appleMaps ? (
								<Animated.View
									entering={FadeIn.duration(180)}
									exiting={FadeOut.duration(120)}
									key="map-live"
									style={styles.mapFrame}
								>
									<appleMaps.View
										cameraPosition={{
											coordinates:
												ITEM_PINS[FILTER_ITEMS[filter][0] ?? "Aurora"],
											zoom: 1,
										}}
										markers={FILTER_ITEMS[filter].map((name) => ({
											coordinates: ITEM_PINS[name],
											id: name,
											systemImage: "mappin",
											title: name,
										}))}
										style={styles.map}
									/>
								</Animated.View>
							) : (
								<Animated.View
									entering={FadeIn.duration(180)}
									exiting={FadeOut.duration(120)}
									key="map"
									style={styles.mapCard}
								>
									<SymbolView
										name="map"
										size={28}
										tintColor={theme.colors.secondary}
									/>
									<Text style={styles.tileCaption}>
										{FILTER_ITEMS[filter].length}{" "}
										{FILTER_ITEMS[filter].length === 1 ? "pin" : "pins"} —
										rebuild the dev client for the live map
									</Text>
								</Animated.View>
							)
						) : segment === 1 ? (
							<View style={styles.resultGrid}>
								{FILTER_ITEMS[filter].map((name) => (
									<Animated.View
										entering={FadeIn.duration(180)}
										exiting={FadeOut.duration(120)}
										key={`grid-${name}`}
										layout={LinearTransition.duration(220)}
										style={styles.resultCard}
									>
										<Text style={styles.resultCardName}>{name}</Text>
									</Animated.View>
								))}
							</View>
						) : (
							FILTER_ITEMS[filter].map((name) => (
								<Animated.View
									entering={FadeIn.duration(180)}
									exiting={FadeOut.duration(120)}
									key={name}
									layout={LinearTransition.duration(220)}
									style={styles.resultRow}
								>
									<View style={styles.resultDot} />
									<Text style={styles.resultName}>{name}</Text>
									<Text style={styles.resultMeta}>{SEGMENTS[segment]}</Text>
								</Animated.View>
							))
						)}
					</Animated.View>
					<Text style={styles.tileCaption}>
						Showing {activeFilter?.label.toLowerCase()} ·{" "}
						{SEGMENTS[segment]?.toLowerCase()} layout
					</Text>
				</Animated.View>
			</ScrollView>

			{isIOS ? (
				<Host style={styles.sheetHost}>
					<BottomSheet
						isPresented={sheetOpen}
						onIsPresentedChange={setSheetOpen}
					>
						<Group
							modifiers={[
								presentationDetents(["medium", "large"]),
								presentationDragIndicator("visible"),
								padding({ all: 24 }),
							]}
						>
							<VStack alignment="leading" spacing={12}>
								<SwiftText
									modifiers={[
										font({ size: 24, weight: "bold" }),
										foregroundColor(theme.colors.ink),
									]}
								>
									Bottom sheet
								</SwiftText>
								<SwiftText
									modifiers={[
										font({ size: 17 }),
										foregroundColor(theme.colors.secondary),
									]}
								>
									SwiftUI presentation from @expo/ui — medium and large detents,
									native drag indicator.
								</SwiftText>
								<SwiftButton
									label="Done"
									modifiers={[
										canUseGlass
											? buttonStyle("glassProminent")
											: buttonStyle("borderedProminent"),
										frame({ height: 44 }),
									]}
									onPress={() => setSheetOpen(false)}
								/>
							</VStack>
						</Group>
					</BottomSheet>
				</Host>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		backgroundColor: theme.colors.surface,
		flex: 1,
	},
	content: {
		gap: theme.gap(1.5),
		paddingBottom: theme.gap(12),
		paddingHorizontal: theme.gap(2),
	},
	titleBlock: {
		gap: theme.gap(0.75),
		paddingBottom: theme.gap(1.5),
		paddingHorizontal: theme.gap(1),
		paddingTop: theme.gap(1),
	},
	title: {
		...theme.type.largeTitle,
		color: theme.colors.ink,
	},
	subtitle: {
		...theme.type.body,
		color: theme.colors.secondary,
	},
	stack: {
		gap: theme.gap(1.5),
	},
	tile: {
		backgroundColor: theme.colors.fill,
		borderCurve: "continuous",
		borderRadius: theme.radius.card,
		flex: 1,
		gap: theme.gap(1.5),
		padding: theme.gap(2),
	},
	tileHero: {
		alignItems: "center",
		backgroundColor: theme.colors.fill,
		borderCurve: "continuous",
		borderRadius: theme.radius.card,
		gap: theme.gap(1.5),
		justifyContent: "center",
		minHeight: 168,
		overflow: "hidden",
		padding: theme.gap(2),
	},
	heroBackdrop: {
		alignItems: "center",
		bottom: 0,
		justifyContent: "center",
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
	},
	heroLogo: {
		height: 60,
		tintColor: theme.colors.ink,
		// Peek above the capsule so the glass visibly cuts the lockup.
		transform: [{ translateY: -24 }],
		width: "80%",
	},
	heroCapsule: {
		alignItems: "center",
		borderRadius: theme.radius.pill,
		flexDirection: "row",
		gap: theme.gap(1),
		minHeight: 48,
		paddingHorizontal: theme.gap(2.5),
	},
	heroCapsuleFallback: {
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.border,
		borderWidth: 1,
	},
	heroCapsuleLabel: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "600",
	},
	heroCaption: {
		...theme.type.caption,
		bottom: theme.gap(1.5),
		color: theme.colors.secondary,
		position: "absolute",
	},
	tileLabel: {
		...theme.type.caption,
		color: theme.colors.secondary,
		textTransform: "uppercase",
	},
	tileBody: {
		...theme.type.body,
		color: theme.colors.ink,
	},
	tileCaption: {
		...theme.type.caption,
		color: theme.colors.secondary,
		fontWeight: "400",
	},
	iconRow: {
		flexDirection: "row",
		gap: theme.gap(1),
		justifyContent: "center",
	},
	buttonHost: {
		height: 44,
	},
	segmentHost: {
		height: 32,
	},
	chipRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: theme.gap(1),
	},
	chipHost: {
		height: 44,
	},
	pill: {
		alignItems: "center",
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.border,
		borderCurve: "continuous",
		borderRadius: theme.radius.pill,
		borderWidth: 1,
		justifyContent: "center",
		minHeight: 44,
		paddingHorizontal: theme.gap(2),
	},
	pillPressed: {
		opacity: 0.6,
	},
	pillLabel: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "600",
	},
	contextHost: {
		minHeight: 112,
	},
	holdCard: {
		alignItems: "center",
		backgroundColor: theme.colors.surface,
		borderCurve: "continuous",
		borderRadius: theme.radius.card,
		flex: 1,
		justifyContent: "center",
		minHeight: 96,
	},
	resultList: {
		gap: theme.gap(0.5),
	},
	resultGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: theme.gap(1),
	},
	resultCard: {
		alignItems: "center",
		backgroundColor: theme.colors.surface,
		borderCurve: "continuous",
		borderRadius: theme.radius.card,
		flexBasis: "45%",
		flexGrow: 1,
		justifyContent: "center",
		minHeight: 72,
		padding: theme.gap(1.5),
	},
	resultCardName: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "500",
		textAlign: "center",
	},
	mapCard: {
		alignItems: "center",
		backgroundColor: theme.colors.surface,
		borderCurve: "continuous",
		borderRadius: theme.radius.card,
		gap: theme.gap(0.5),
		justifyContent: "center",
		minHeight: 112,
		paddingHorizontal: theme.gap(2),
	},
	mapFrame: {
		borderCurve: "continuous",
		borderRadius: theme.radius.card,
		height: 220,
		overflow: "hidden",
	},
	map: {
		flex: 1,
	},
	resultRow: {
		alignItems: "center",
		flexDirection: "row",
		gap: theme.gap(1),
		minHeight: 32,
	},
	resultDot: {
		backgroundColor: theme.colors.ink,
		borderRadius: 4,
		height: 8,
		opacity: 0.35,
		width: 8,
	},
	resultName: {
		...theme.type.body,
		color: theme.colors.ink,
		flex: 1,
		fontWeight: "500",
	},
	resultMeta: {
		...theme.type.caption,
		color: theme.colors.secondary,
		fontWeight: "400",
	},
	sheetHost: {
		position: "absolute",
	},
}));
