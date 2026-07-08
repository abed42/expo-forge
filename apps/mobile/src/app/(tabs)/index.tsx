import { IconButton, Skeleton } from "@repo/design-system";
import { useRouter } from "expo-router";
import { Image, Text, View } from "react-native";
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
				<IconButton
					accessibilityLabel="Search"
					onPress={() => router.push("/search")}
				>
					<Text style={styles.searchGlyph}>{"⌕"}</Text>
				</IconButton>
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
		justifyContent: "space-between",
		marginBottom: theme.gap(1),
	},
	logo: {
		height: 26,
		tintColor: theme.colors.ink,
		width: 120,
	},
	searchGlyph: {
		color: theme.colors.secondary,
		fontSize: 26,
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
