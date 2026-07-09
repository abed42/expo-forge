import { IconButton, Skeleton } from "@repo/design-system";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Image, Platform, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { type FeedItem, useFeed } from "@/lib/feed";

export default function ItemDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { theme } = useUnistyles();
	const { items, status } = useFeed();
	const [item, setItem] = useState<FeedItem | null>(null);

	useEffect(() => {
		if (!id) {
			return;
		}
		const match = items.find((row) => row.id === id) ?? null;
		setItem(match);
	}, [id, items]);

	const loading = status === "loading" && !item;

	return (
		<View style={styles.screen}>
			<Stack.Screen options={{ headerShown: false }} />
			<ScrollView
				contentContainerStyle={{
					paddingBottom: insets.bottom + theme.gap(8),
				}}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View style={styles.hero}>
					{item?.image_url ? (
						<Link.AppleZoomTarget>
							<Image
								resizeMode="cover"
								source={{ uri: item.image_url }}
								style={styles.heroImage}
							/>
						</Link.AppleZoomTarget>
					) : (
						<View style={styles.heroImage}>
							{loading ? null : <Skeleton height={16} width={120} />}
						</View>
					)}
				</View>

				<View style={styles.body}>
					{item ? (
						<>
							<Text style={styles.title}>{item.title}</Text>
							{item.subtitle ? (
								<Text style={styles.subtitle}>{item.subtitle}</Text>
							) : null}
						</>
					) : loading ? (
						<>
							<Skeleton height={28} width={240} />
							<Skeleton height={16} width={160} />
						</>
					) : (
						<Text style={styles.subtitle}>Item not found.</Text>
					)}
				</View>
			</ScrollView>

			<View
				style={[
					styles.chrome,
					{
						paddingTop: insets.top + theme.gap(1),
						paddingHorizontal: theme.gap(2),
					},
				]}
			>
				<IconButton
					accessibilityLabel="Back"
					glass
					onPress={() => router.back()}
				>
					<SymbolView
						name={Platform.OS === "ios" ? "chevron.left" : "arrow.left"}
						size={17}
						tintColor={theme.colors.ink}
					/>
				</IconButton>
				{item ? (
					<IconButton
						accessibilityLabel="Share"
						glass
						onPress={() => {
							void Share.share({
								message: item.subtitle
									? `${item.title} — ${item.subtitle}`
									: item.title,
								url: item.image_url ?? undefined,
							});
						}}
					>
						<SymbolView
							name="square.and.arrow.up"
							size={17}
							tintColor={theme.colors.ink}
						/>
					</IconButton>
				) : (
					<View />
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		backgroundColor: theme.colors.surface,
		flex: 1,
	},
	chrome: {
		flexDirection: "row",
		justifyContent: "space-between",
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
	},
	hero: {
		aspectRatio: 0.88,
		backgroundColor: theme.colors.fill,
		width: "100%",
	},
	heroImage: {
		alignItems: "center",
		height: "100%",
		justifyContent: "center",
		width: "100%",
	},
	body: {
		gap: theme.gap(1),
		paddingHorizontal: theme.gap(3),
		paddingTop: theme.gap(3),
	},
	title: {
		...theme.type.title,
		color: theme.colors.ink,
	},
	subtitle: {
		...theme.type.body,
		color: theme.colors.secondary,
	},
}));
