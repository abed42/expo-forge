import { Host, HStack, Image as SwiftImage } from "@expo/ui/swift-ui";
import { frame, glassEffect } from "@expo/ui/swift-ui/modifiers";
import { IconButton, Skeleton } from "@repo/design-system";
import { FlashList } from "@shopify/flash-list";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Link, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Image, Platform, Pressable, Share, Text, View } from "react-native";
import Animated, {
	interpolate,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
	type AppearancePreference,
	loadAppearance,
	saveAppearance,
} from "@/lib/appearance";
import { aspectFor } from "@/lib/aspect";
import { type FeedItem, useFeed } from "@/lib/feed";

// Gate required: some iOS 26 builds lack the API and crash without it.
const canUseGlass = isLiquidGlassAvailable();

const HEADER_CONTENT_HEIGHT = 60;

// While loading — and whenever Supabase is unset, errors, or returns no rows —
// the list falls back to these skeleton items so Home never crashes.
const SKELETON_ITEMS = [0, 1, 2, 3, 4, 5];

type FeedListItem = FeedItem | number;

const AnimatedFlashList = Animated.createAnimatedComponent(
	FlashList,
) as unknown as typeof FlashList;

function FeedCell({ item }: { item: FeedItem }) {
	const aspectRatio = aspectFor(item.id);

	return (
		<View style={styles.cell}>
			<Link asChild href={`/item/${item.id}`}>
				<Link.Trigger>
					<Pressable style={[styles.card, { aspectRatio }]}>
						<Link.AppleZoom>
							{item.image_url ? (
								<Image
									resizeMode="cover"
									source={{ uri: item.image_url }}
									style={styles.cardImage}
								/>
							) : (
								<View style={styles.cardImage} />
							)}
						</Link.AppleZoom>
					</Pressable>
				</Link.Trigger>
				<Link.Menu>
					<Link.MenuAction
						icon="square.and.arrow.up"
						onPress={() => {
							void Share.share({
								message: item.subtitle
									? `${item.title} — ${item.subtitle}`
									: item.title,
								url: item.image_url ?? undefined,
							});
						}}
					>
						Share
					</Link.MenuAction>
					<Link.MenuAction
						icon="doc.on.doc"
						onPress={() => {
							void Share.share({ message: item.title });
						}}
					>
						Copy title
					</Link.MenuAction>
				</Link.Menu>
			</Link>
			<Text numberOfLines={2} style={styles.itemTitle}>
				{item.title}
			</Text>
		</View>
	);
}

function SkeletonCell({ index }: { index: number }) {
	return (
		<View style={styles.cell}>
			<View style={[styles.card, { aspectRatio: aspectFor(index) }]} />
			<Skeleton height={14} width={120} />
		</View>
	);
}

export default function HomeScreen() {
	const router = useRouter();
	const { theme } = useUnistyles();
	const insets = useSafeAreaInsets();
	const { items, status } = useFeed();

	const listData: readonly FeedListItem[] =
		status === "ready" && items.length > 0 ? items : SKELETON_ITEMS;

	const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
	const [appearance, setAppearance] = useState<AppearancePreference>("system");

	useEffect(() => {
		loadAppearance().then(setAppearance);
	}, []);

	const cycleAppearance = () => {
		const next: AppearancePreference =
			appearance === "system"
				? "dark"
				: appearance === "dark"
					? "light"
					: "system";
		setAppearance(next);
		saveAppearance(next);
	};

	const appearanceSymbol =
		appearance === "system"
			? "circle.lefthalf.filled"
			: appearance === "dark"
				? "moon.fill"
				: "sun.max.fill";
	const scrollY = useSharedValue(0);

	const onScroll = useAnimatedScrollHandler((event) => {
		scrollY.value = event.contentOffset.y;
	});

	const materialStyle = useAnimatedStyle(() => ({
		opacity: interpolate(scrollY.value, [0, 32], [0, 1], "clamp"),
	}));

	const headerContent = (
		<View style={[styles.headerRow, { marginTop: insets.top }]}>
			<View style={styles.logoPill}>
				<Animated.View style={[styles.pillMaterial, materialStyle]}>
					{Platform.OS === "ios" && canUseGlass ? (
						<Host style={styles.pillFill}>
							<HStack
								modifiers={[
									frame({ height: 44, width: 152 }),
									glassEffect({
										glass: { variant: "regular" },
										shape: "capsule",
									}),
								]}
							>
								{null}
							</HStack>
						</Host>
					) : (
						<View style={[styles.pillFill, styles.pillFallback]} />
					)}
				</Animated.View>
				<Image
					resizeMode="contain"
					source={require("../../../assets/images/expo-forge-lockup.png")}
					style={styles.logo}
				/>
			</View>
			<View style={styles.headerActions}>
				<IconButton
					accessibilityLabel="Toggle appearance"
					glass
					onPress={cycleAppearance}
				>
					<SymbolView
						name={appearanceSymbol}
						size={17}
						tintColor={theme.colors.ink}
					/>
				</IconButton>
				{Platform.OS === "ios" && canUseGlass ? (
					<Host style={styles.searchHost}>
						<SwiftImage
							modifiers={[
								frame({ height: 44, width: 44 }),
								glassEffect({
									glass: { interactive: true, variant: "regular" },
									shape: "circle",
								}),
							]}
							onPress={() => router.push("/search")}
							size={17}
							systemName="magnifyingglass"
						/>
					</Host>
				) : (
					<IconButton
						accessibilityLabel="Search"
						onPress={() => router.push("/search")}
					>
						<SymbolView
							name="magnifyingglass"
							size={18}
							tintColor={theme.colors.ink}
						/>
					</IconButton>
				)}
			</View>
		</View>
	);

	return (
		<View style={styles.screen}>
			<AnimatedFlashList
				onScroll={onScroll}
				scrollEventThrottle={16}
				contentContainerStyle={{
					paddingBottom: theme.gap(14),
					paddingHorizontal: theme.gap(2),
					paddingTop: headerHeight + theme.gap(1),
				}}
				data={listData}
				keyExtractor={(item) =>
					typeof item === "number" ? `skeleton-${item}` : item.id
				}
				masonry
				numColumns={2}
				optimizeItemArrangement
				renderItem={({ item }) =>
					typeof item === "number" ? (
						<SkeletonCell index={item} />
					) : (
						<FeedCell item={item} />
					)
				}
				showsVerticalScrollIndicator={false}
			/>
			<View style={[styles.header, { height: headerHeight }]}>
				{headerContent}
			</View>
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		backgroundColor: theme.colors.surface,
		flex: 1,
	},
	header: {
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
	},
	headerActions: {
		alignItems: "center",
		flexDirection: "row",
		gap: theme.gap(1),
	},
	searchHost: {
		height: 44,
		width: 44,
	},
	logoPill: {
		borderRadius: theme.radius.pill,
		height: 44,
		justifyContent: "center",
		overflow: "hidden",
		paddingHorizontal: theme.gap(2),
	},
	pillMaterial: {
		borderRadius: theme.radius.pill,
		bottom: 0,
		left: 0,
		overflow: "hidden",
		position: "absolute",
		right: 0,
		top: 0,
	},
	pillFill: {
		flex: 1,
	},
	pillFallback: {
		backgroundColor: theme.colors.fill,
	},
	headerRow: {
		alignItems: "center",
		flex: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: theme.gap(3),
	},
	logo: {
		height: 26,
		tintColor: theme.colors.ink,
		width: 120,
	},
	cell: {
		gap: theme.gap(1),
		padding: theme.gap(1),
	},
	card: {
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.card,
		overflow: "hidden",
		width: "100%",
	},
	cardImage: {
		height: "100%",
		width: "100%",
	},
	itemTitle: {
		...theme.type.caption,
		color: theme.colors.ink,
		fontWeight: "600",
	},
}));
