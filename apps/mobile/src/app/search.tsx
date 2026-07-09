import { SearchField, Skeleton } from "@repo/design-system";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
	Image,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { useFeed } from "@/lib/feed";

export default function SearchScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { items, status } = useFeed();
	const [query, setQuery] = useState("");

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return items;
		}
		return items.filter(
			(item) =>
				item.title.toLowerCase().includes(q) ||
				(item.subtitle?.toLowerCase().includes(q) ?? false),
		);
	}, [items, query]);

	return (
		<View style={styles.screen}>
			<Stack.Screen options={{ headerShown: false }} />
			<View
				style={[
					styles.header,
					{ paddingTop: insets.top + (Platform.OS === "android" ? 8 : 0) },
				]}
			>
				<View style={styles.fieldWrap}>
					<SearchField
						autoFocus
						onChangeText={setQuery}
						placeholder="Search the feed"
						value={query}
					/>
				</View>
				<Pressable
					accessibilityRole="button"
					onPress={() => router.back()}
					style={({ pressed }) => [
						styles.cancel,
						pressed ? styles.cancelPressed : null,
					]}
				>
					<Text style={styles.cancelLabel}>Cancel</Text>
				</Pressable>
			</View>

			<ScrollView
				contentContainerStyle={styles.list}
				keyboardDismissMode="on-drag"
				keyboardShouldPersistTaps="handled"
			>
				{status === "loading" ? (
					<View style={styles.skeletonBlock}>
						<Skeleton height={18} width={180} />
						<Skeleton height={14} width={120} />
					</View>
				) : results.length === 0 ? (
					<Text style={styles.empty}>
						{query.trim() ? "No matches." : "Nothing to search yet."}
					</Text>
				) : (
					results.map((item) => (
						<Pressable
							key={item.id}
							onPress={() => router.push(`/item/${item.id}`)}
							style={({ pressed }) => [
								styles.row,
								pressed ? styles.rowPressed : null,
							]}
						>
							<View style={styles.thumb}>
								{item.image_url ? (
									<Image
										resizeMode="cover"
										source={{ uri: item.image_url }}
										style={styles.thumbImage}
									/>
								) : null}
							</View>
							<View style={styles.rowText}>
								<Text numberOfLines={1} style={styles.rowTitle}>
									{item.title}
								</Text>
								{item.subtitle ? (
									<Text numberOfLines={1} style={styles.rowSubtitle}>
										{item.subtitle}
									</Text>
								) : null}
							</View>
						</Pressable>
					))
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		backgroundColor: theme.colors.surface,
		flex: 1,
	},
	header: {
		alignItems: "center",
		flexDirection: "row",
		gap: theme.gap(1.5),
		paddingHorizontal: theme.gap(2),
		paddingBottom: theme.gap(1.5),
	},
	fieldWrap: {
		flex: 1,
	},
	cancel: {
		paddingHorizontal: theme.gap(0.5),
		paddingVertical: theme.gap(1),
	},
	cancelPressed: {
		opacity: 0.6,
	},
	cancelLabel: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "500",
	},
	list: {
		gap: theme.gap(0.5),
		paddingBottom: theme.gap(12),
		paddingHorizontal: theme.gap(2),
	},
	skeletonBlock: {
		gap: theme.gap(1),
		paddingTop: theme.gap(2),
	},
	empty: {
		...theme.type.body,
		color: theme.colors.secondary,
		paddingTop: theme.gap(4),
		textAlign: "center",
	},
	row: {
		alignItems: "center",
		borderRadius: theme.radius.card,
		flexDirection: "row",
		gap: theme.gap(1.5),
		paddingVertical: theme.gap(1),
	},
	rowPressed: {
		opacity: 0.7,
	},
	thumb: {
		aspectRatio: 1,
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.card,
		overflow: "hidden",
		width: 56,
	},
	thumbImage: {
		height: "100%",
		width: "100%",
	},
	rowText: {
		flex: 1,
		gap: theme.gap(0.25),
	},
	rowTitle: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "600",
	},
	rowSubtitle: {
		...theme.type.caption,
		color: theme.colors.secondary,
	},
}));
