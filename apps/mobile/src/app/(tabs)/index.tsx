import { Host, HStack, Image as SwiftImage } from "@expo/ui/swift-ui";
import { frame, glassEffect } from "@expo/ui/swift-ui/modifiers";
import { IconButton, Skeleton } from "@repo/design-system";
import { FlashList } from "@shopify/flash-list";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Image, Platform, Text, View } from "react-native";
import Animated, {
	interpolate,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { type FeedItem, useFeed } from "@/lib/feed";

// Gate required: some iOS 26 builds lack the API and crash without it.
const canUseGlass = isLiquidGlassAvailable();

const HEADER_CONTENT_HEIGHT = 60;

// The feed hydrates from Supabase (public.feed_items, migration 0003).
// While loading — and whenever Supabase is unset, errors, or returns no rows —
// the list falls back to these skeleton items, so Home never crashes and
// always renders an honest state. The header floats on liquid glass; the
// feed scrolls underneath it.
const SKELETON_ITEMS = [0, 1, 2];

// One FlashList carries both worlds: numbers render skeletons, rows render
// the real feed.
type FeedListItem = FeedItem | number;

const AnimatedFlashList = Animated.createAnimatedComponent(
	FlashList,
) as unknown as typeof FlashList;

function FeedSeparator() {
	return <View style={styles.separator} />;
}

export default function HomeScreen() {
	const router = useRouter();
	const { theme } = useUnistyles();
	const insets = useSafeAreaInsets();
	const { items, status } = useFeed();

	const listData: readonly FeedListItem[] =
		status === "ready" && items.length > 0 ? items : SKELETON_ITEMS;

	const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
	const scrollY = useSharedValue(0);

	const onScroll = useAnimatedScrollHandler((event) => {
		scrollY.value = event.contentOffset.y;
	});

	// Header material fades in over the first 32pt of scroll — at rest the
	// bar is invisible and the screen reads as one clean surface.
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
			{Platform.OS === "ios" && canUseGlass ? (
				// True system glass: SwiftUI .glassEffect with vibrancy and the
				// interactive press shimmer — same pipeline as the native tab bar.
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
	);

	return (
		<View style={styles.screen}>
			<AnimatedFlashList
				onScroll={onScroll}
				scrollEventThrottle={16}
				contentContainerStyle={{
					paddingBottom: theme.gap(14),
					paddingHorizontal: theme.gap(3),
					paddingTop: headerHeight + theme.gap(1),
				}}
				data={listData}
				ItemSeparatorComponent={FeedSeparator}
				keyExtractor={(item) =>
					typeof item === "number" ? `skeleton-${item}` : item.id
				}
				renderItem={({ item }) =>
					typeof item === "number" ? (
						<View style={styles.feedItem}>
							<View style={styles.card} />
							<View style={styles.titleRow}>
								<Skeleton height={16} width={220} />
								<Skeleton height={16} width={64} />
							</View>
							<Skeleton height={14} width={160} />
							<Skeleton height={14} width={120} />
							<Skeleton height={14} width={120} />
						</View>
					) : (
						<View style={styles.feedItem}>
							<View style={[styles.card, styles.cardClip]}>
								{item.image_url ? (
									<Image
										resizeMode="cover"
										source={{ uri: item.image_url }}
										style={styles.cardImage}
									/>
								) : null}
							</View>
							<Text style={styles.itemTitle}>{item.title}</Text>
							{item.subtitle ? (
								<Text style={styles.itemSubtitle}>{item.subtitle}</Text>
							) : null}
						</View>
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
	feedItem: {
		gap: theme.gap(1.5),
	},
	separator: {
		height: theme.gap(4),
	},
	card: {
		aspectRatio: 0.88,
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.card,
		marginBottom: theme.gap(0.5),
	},
	cardClip: {
		overflow: "hidden",
	},
	cardImage: {
		height: "100%",
		width: "100%",
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	itemTitle: {
		...theme.type.body,
		color: theme.colors.ink,
	},
	itemSubtitle: {
		...theme.type.caption,
		color: theme.colors.secondary,
	},
}));
