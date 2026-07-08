import { Skeleton } from "@repo/design-system";
import { useRouter } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

// Home ships as an honest loading state: search entry on top, one large
// media card + text bars skeleton below — the shape the demo feed fills in.
export default function HomeScreen() {
	const router = useRouter();

	return (
		<SafeAreaView edges={["top"]} style={styles.screen}>
			<View style={styles.header}>
				<Image
					resizeMode="contain"
					source={require("../../../assets/images/expo-forge-lockup.png")}
					style={styles.logo}
				/>
				<Pressable
					accessibilityRole="button"
					onPress={() => router.push("/search")}
					style={({ pressed }) => [
						styles.searchBar,
						pressed ? styles.searchBarPressed : null,
					]}
				>
					<Text style={styles.searchGlyph}>{"⌕"}</Text>
					<Text style={styles.searchLabel}>Search</Text>
				</Pressable>
			</View>

			<View style={styles.card} />

			<View style={styles.titleRow}>
				<Skeleton height={16} width={220} />
				<Skeleton height={16} width={64} />
			</View>
			<Skeleton height={14} width={160} />
			<Skeleton height={14} width={120} />
			<Skeleton height={14} width={120} />
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
		gap: theme.gap(2),
		marginBottom: theme.gap(1),
	},
	logo: {
		height: 26,
		tintColor: theme.colors.ink,
		width: 120,
	},
	searchBar: {
		alignItems: "center",
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.pill,
		flex: 1,
		flexDirection: "row",
		gap: theme.gap(1),
		minHeight: 48,
		paddingHorizontal: theme.gap(2.5),
	},
	searchBarPressed: {
		opacity: 0.8,
	},
	searchGlyph: {
		color: theme.colors.secondary,
		fontSize: 26,
	},
	searchLabel: {
		...theme.type.body,
		color: theme.colors.secondary,
	},
	card: {
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.card,
		flex: 0.62,
		marginBottom: theme.gap(1),
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
}));
