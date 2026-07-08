import { IconButton, Skeleton } from "@repo/design-system";
import { FlashList } from "@shopify/flash-list";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Image, View } from "react-native";
import Animated, {
	interpolate,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

// Gate required: some iOS 26 builds lack the API and crash without it.
const canUseGlass = isLiquidGlassAvailable();

const HEADER_CONTENT_HEIGHT = 60;

// Home ships as an honest loading state: the FlashList that will render the
// real feed, hydrated with skeleton items until the data layer lands. The
// header floats on liquid glass; the feed scrolls underneath it.
const SKELETON_ITEMS = [0, 1, 2];

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
					{canUseGlass ? (
						<GlassView glassEffectStyle="regular" style={styles.pillFill} />
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
				data={SKELETON_ITEMS}
				ItemSeparatorComponent={FeedSeparator}
				renderItem={({ index }) => (
					<View style={styles.feedItem}>
						{index === 0 ? (
							<Image
								resizeMode="cover"
								source={require("../../../assets/images/onboarding/main.webp")}
								style={styles.card}
							/>
						) : (
							<View style={styles.card} />
						)}
						<View style={styles.titleRow}>
							<Skeleton height={16} width={220} />
							<Skeleton height={16} width={64} />
						</View>
						<Skeleton height={14} width={160} />
						<Skeleton height={14} width={120} />
						<Skeleton height={14} width={120} />
					</View>
				)}
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
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
}));
