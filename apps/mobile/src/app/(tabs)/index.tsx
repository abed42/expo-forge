import { IconButton, Skeleton } from "@repo/design-system";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

// Home ships as an honest loading state: the FlashList that will render the
// real feed, hydrated with skeleton items until the data layer lands.
const SKELETON_ITEMS = [0, 1, 2];

function FeedSeparator() {
	return <View style={styles.separator} />;
}

export default function HomeScreen() {
	const router = useRouter();
	const { theme } = useUnistyles();

	return (
		<SafeAreaView edges={["top"]} style={styles.screen}>
			<View style={styles.header}>
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

			<FlashList
				contentContainerStyle={styles.feed}
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
		</SafeAreaView>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		backgroundColor: theme.colors.surface,
		flex: 1,
		gap: theme.gap(1.5),
		paddingHorizontal: theme.gap(3),
	},
	header: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: theme.gap(1),
	},
	logo: {
		height: 26,
		tintColor: theme.colors.ink,
		width: 120,
	},
	feed: {
		paddingBottom: theme.gap(14),
	},
	separator: {
		height: theme.gap(4),
	},
	feedItem: {
		gap: theme.gap(1.5),
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
