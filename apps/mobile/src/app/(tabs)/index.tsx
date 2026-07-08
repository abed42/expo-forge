import { IconButton, Skeleton } from "@repo/design-system";
import { FlashList } from "@shopify/flash-list";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

// Gate required: some iOS 26 builds lack the API and crash without it.
const canUseGlass = isLiquidGlassAvailable();

const HEADER_CONTENT_HEIGHT = 60;

// Home ships as an honest loading state: the FlashList that will render the
// real feed, hydrated with skeleton items until the data layer lands. The
// header floats on liquid glass; the feed scrolls underneath it.
const SKELETON_ITEMS = [0, 1, 2];

function FeedSeparator() {
	return <View style={styles.separator} />;
}

export default function HomeScreen() {
	const router = useRouter();
	const { theme } = useUnistyles();
	const insets = useSafeAreaInsets();

	const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

	const headerContent = (
		<View style={[styles.headerRow, { marginTop: insets.top }]}>
			<Image
				resizeMode="contain"
				source={require("../../../assets/images/expo-forge-lockup.png")}
				style={styles.logo}
			/>
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
			<FlashList
				contentContainerStyle={{
					paddingBottom: theme.gap(14),
					paddingHorizontal: theme.gap(3),
					paddingTop: headerHeight + theme.gap(1),
				}}
				data={SKELETON_ITEMS}
				ItemSeparatorComponent={FeedSeparator}
				renderItem={() => (
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
				)}
				showsVerticalScrollIndicator={false}
			/>
			{canUseGlass ? (
				<GlassView
					glassEffectStyle="regular"
					style={[styles.header, { height: headerHeight }]}
				>
					{headerContent}
				</GlassView>
			) : (
				<View
					style={[
						styles.header,
						styles.headerFallback,
						{ height: headerHeight },
					]}
				>
					{headerContent}
				</View>
			)}
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
	headerFallback: {
		backgroundColor: theme.colors.surface,
		borderBottomColor: theme.colors.border,
		borderBottomWidth: 1,
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
