import { useAuth, useUser } from "@repo/auth";
import { Chip, IconButton, Skeleton } from "@repo/design-system";
import { registerForPush, sendTestNotification } from "@repo/notifications";
import { isPaymentsConfigured, usePaywall } from "@repo/payments";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
	ActionSheetIOS,
	Alert,
	Image,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
	APPEARANCE_LABELS,
	type AppearancePreference,
	loadAppearance,
	saveAppearance,
} from "@/lib/appearance";
import { useFeed } from "@/lib/feed";

type NotificationsValue = "Off" | "Enabled" | "Local" | "Needs setup";

const APPEARANCE_OPTIONS: AppearancePreference[] = ["system", "light", "dark"];

function isUserCancelled(error: unknown): boolean {
	if ((error as { userCancelled?: boolean })?.userCancelled === true) {
		return true;
	}
	return /cancel/i.test(String((error as { message?: string })?.message ?? ""));
}

export default function ProfileScreen() {
	const router = useRouter();
	const { theme } = useUnistyles();
	const { user, isLoaded } = useUser();
	const { signOut } = useAuth();
	const { items } = useFeed();
	const { restore } = usePaywall();
	const paymentsReady = isPaymentsConfigured();
	const [appearance, setAppearance] = useState<AppearancePreference>("system");
	const insets = useSafeAreaInsets();
	const [notifications, setNotifications] = useState<NotificationsValue>("Off");
	const [restoring, setRestoring] = useState(false);

	useEffect(() => {
		loadAppearance().then(setAppearance);
	}, []);

	const pickAppearance = (preference: AppearancePreference) => {
		setAppearance(preference);
		saveAppearance(preference);
	};

	const chooseAppearance = () => {
		if (Platform.OS === "ios") {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					cancelButtonIndex: APPEARANCE_OPTIONS.length,
					options: [
						...APPEARANCE_OPTIONS.map((option) => APPEARANCE_LABELS[option]),
						"Cancel",
					],
				},
				(index: number) => {
					const preference = APPEARANCE_OPTIONS[index];
					if (preference) {
						pickAppearance(preference);
					}
				},
			);
			return;
		}
		Alert.alert(
			"Appearance",
			undefined,
			APPEARANCE_OPTIONS.map((option) => ({
				text: APPEARANCE_LABELS[option],
				onPress: () => pickAppearance(option),
			})),
		);
	};

	const enableNotifications = async () => {
		const result = await registerForPush();

		if (result.ok) {
			console.info("[mobile] Expo push token:", result.token);
			setNotifications("Enabled");
			return;
		}

		switch (result.reason) {
			case "simulator": {
				// Remote push tokens need a real device; local banners still work
				// (same path as Home's "Send test notification").
				const local = await sendTestNotification();
				if (local.ok) {
					setNotifications("Local");
					return;
				}
				setNotifications("Off");
				Alert.alert(
					"Notifications",
					local.reason === "denied"
						? "Permission denied — enable notifications in Settings."
						: "Could not schedule a local notification.",
				);
				break;
			}
			case "denied":
				setNotifications("Off");
				if (result.canAskAgain === false) {
					Alert.alert(
						"Notifications",
						"Notifications are turned off for this app. Enable them in Settings.",
						[
							{ style: "cancel", text: "Not now" },
							{ onPress: () => Linking.openSettings(), text: "Open Settings" },
						],
					);
				}
				break;
			case "missing-project-id":
				setNotifications("Needs setup");
				Alert.alert(
					"Notifications",
					"Push notifications need an EAS project. Run `eas init` first.",
				);
				break;
			case "token-failure":
				setNotifications("Off");
				Alert.alert(
					"Notifications",
					"Could not get a push token. Try again later.",
				);
				break;
		}
	};

	const restorePurchases = async () => {
		if (restoring) {
			return;
		}
		if (!paymentsReady) {
			Alert.alert(
				"Restore purchases",
				"RevenueCat isn't configured. Add EXPO_PUBLIC_REVENUECAT_API_KEY to apps/mobile/.env.local, or open Pro to see setup details.",
				[
					{ style: "cancel", text: "Not now" },
					{ onPress: () => router.push("/paywall"), text: "Open Pro" },
				],
			);
			return;
		}

		setRestoring(true);
		try {
			const result = await restore();
			if (!result) {
				Alert.alert("Restore purchases", "Could not reach RevenueCat.");
				return;
			}
			const active = Object.keys(result.entitlements.active);
			Alert.alert(
				"Restored",
				active.length > 0
					? `Active: ${active.join(", ")}`
					: "No active entitlements found for this Apple/Google account.",
			);
		} catch (error) {
			if (!isUserCancelled(error)) {
				Alert.alert(
					"Restore failed",
					(error as { message?: string })?.message ??
						"Could not restore purchases.",
				);
			}
		} finally {
			setRestoring(false);
		}
	};

	const googleAccount = user?.externalAccounts?.find(
		(account) => account.provider === "google",
	);
	const appleAccount = user?.externalAccounts?.find(
		(account) => account.provider === "apple",
	);

	const clerkErrorMessage = (updateError: unknown): string => {
		const errors = (
			updateError as {
				errors?: Array<{
					message?: string;
					longMessage?: string;
					code?: string;
				}>;
			}
		)?.errors;
		const first = errors?.[0];
		const raw = first?.longMessage ?? first?.message ?? "";
		// Clerk returns "is unknown" / form_param_unknown when Username isn't
		// enabled on the instance — surface the real fix instead of the raw string.
		if (
			first?.code === "form_param_unknown" ||
			/is unknown/i.test(raw) ||
			/username.*unknown/i.test(raw)
		) {
			return "Username isn't enabled for this Clerk app. Turn it on under Configure → Email, phone, username.";
		}
		return raw || "Could not update username.";
	};

	const editUsername = () => {
		Alert.prompt(
			"Set username",
			"Requires the Username attribute to be enabled in your Clerk dashboard.",
			async (value) => {
				const username = value?.trim();
				if (!(username && user)) {
					return;
				}
				try {
					await user.update({ username });
					await user.reload();
				} catch (updateError) {
					Alert.alert("Username", clerkErrorMessage(updateError));
				}
			},
			"plain-text",
			user?.username ?? "",
		);
	};

	const masonryPreview = items.slice(0, 6);

	return (
		<ScrollView
			contentContainerStyle={[
				styles.content,
				Platform.OS === "android" ? { paddingTop: insets.top + 16 } : null,
			]}
			contentInsetAdjustmentBehavior="automatic"
			style={styles.screen}
		>
			<View style={styles.topBar}>
				<Text style={styles.title}>Profile</Text>
				<View style={styles.topBarActions}>
					<IconButton
						accessibilityLabel="Pro"
						onPress={() => router.push("/paywall")}
					>
						<SymbolView name="crown" size={17} tintColor={theme.colors.ink} />
					</IconButton>
					<IconButton accessibilityLabel="Sign out" onPress={() => signOut()}>
						<SymbolView
							name="rectangle.portrait.and.arrow.right"
							size={17}
							tintColor={theme.colors.ink}
						/>
					</IconButton>
				</View>
			</View>

			<View style={styles.identity}>
				{isLoaded && user?.imageUrl ? (
					<Image source={{ uri: user.imageUrl }} style={styles.avatar} />
				) : (
					<Skeleton height={88} radius={44} width={88} />
				)}
				{isLoaded && user?.fullName ? (
					<Text style={styles.name}>{user.fullName}</Text>
				) : (
					<Skeleton height={22} width={160} />
				)}
				{isLoaded && user ? (
					<Text style={styles.identitySub}>
						{user.username
							? `@${user.username}`
							: user.createdAt
								? `Joined ${new Date(user.createdAt).toLocaleDateString(
										undefined,
										{ month: "long", year: "numeric" },
									)}`
								: "Signed in"}
					</Text>
				) : (
					<Skeleton height={14} width={120} />
				)}
			</View>

			<View style={styles.chips}>
				<Chip
					count={masonryPreview.length || undefined}
					icon={
						<SymbolView
							name="square.grid.2x2"
							size={14}
							tintColor={theme.colors.ink}
						/>
					}
					label="Feed"
					onPress={() => router.push("/")}
				/>
				<Chip
					icon={
						<SymbolView
							name={
								appearance === "dark"
									? "moon.fill"
									: appearance === "light"
										? "sun.max.fill"
										: "circle.lefthalf.filled"
							}
							size={14}
							tintColor={theme.colors.ink}
						/>
					}
					label={APPEARANCE_LABELS[appearance]}
					onPress={chooseAppearance}
				/>
				<Chip
					icon={
						<SymbolView name="bell" size={14} tintColor={theme.colors.ink} />
					}
					label={notifications}
					onPress={enableNotifications}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Account</Text>
				<Pressable
					onPress={editUsername}
					style={({ pressed }) => [
						styles.row,
						pressed ? styles.rowPressed : null,
					]}
				>
					<Text style={styles.rowLabel}>Username</Text>
					<Text style={styles.rowValue}>
						{user?.username ? `@${user.username}` : "Set"}
					</Text>
				</Pressable>
				{user?.primaryEmailAddress?.emailAddress ? (
					<View style={[styles.row, styles.rowBorder]}>
						<Text style={styles.rowLabel}>Email</Text>
						<Text numberOfLines={1} style={styles.rowValue}>
							{user.primaryEmailAddress.emailAddress}
						</Text>
					</View>
				) : null}
				{googleAccount ? (
					<View style={[styles.row, styles.rowBorder]}>
						<Text style={styles.rowLabel}>Google</Text>
						<Text numberOfLines={1} style={styles.rowValue}>
							Connected
						</Text>
					</View>
				) : null}
				{appleAccount ? (
					<View style={[styles.row, styles.rowBorder]}>
						<Text style={styles.rowLabel}>Apple</Text>
						<Text numberOfLines={1} style={styles.rowValue}>
							Connected
						</Text>
					</View>
				) : null}
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Subscriptions</Text>
				<Pressable
					onPress={() => router.push("/paywall")}
					style={({ pressed }) => [
						styles.row,
						pressed ? styles.rowPressed : null,
					]}
				>
					<Text style={styles.rowLabel}>Pro</Text>
					<Text style={styles.rowValue}>
						{paymentsReady ? "View plans" : "Not configured"}
					</Text>
				</Pressable>
				<Pressable
					disabled={restoring}
					onPress={() => void restorePurchases()}
					style={({ pressed }) => [
						styles.row,
						styles.rowBorder,
						pressed ? styles.rowPressed : null,
					]}
				>
					<Text style={styles.rowLabel}>Restore purchases</Text>
					<Text style={styles.rowValue}>
						{restoring ? "…" : paymentsReady ? "Restore" : "Setup needed"}
					</Text>
				</Pressable>
			</View>

			{masonryPreview.length > 0 ? (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Recent</Text>
					<View style={styles.masonry}>
						{masonryPreview.map((item) => (
							<Pressable
								key={item.id}
								onPress={() => router.push(`/item/${item.id}`)}
								style={styles.masonryCell}
							>
								<View style={styles.masonryCard}>
									{item.image_url ? (
										<Image
											resizeMode="cover"
											source={{ uri: item.image_url }}
											style={styles.masonryImage}
										/>
									) : null}
								</View>
							</Pressable>
						))}
					</View>
				</View>
			) : null}

			<Pressable
				accessibilityRole="button"
				onPress={() => signOut()}
				style={({ pressed }) => [
					styles.signOut,
					pressed ? styles.signOutPressed : null,
				]}
			>
				<Text style={styles.signOutLabel}>Sign out</Text>
			</Pressable>
		</ScrollView>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		backgroundColor: theme.colors.surface,
		flex: 1,
	},
	content: {
		gap: theme.gap(3),
		padding: theme.gap(3),
		paddingBottom: theme.gap(16),
	},
	topBar: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
	},
	topBarActions: {
		flexDirection: "row",
		gap: theme.gap(1),
	},
	title: {
		...theme.type.largeTitle,
		color: theme.colors.ink,
	},
	identity: {
		alignItems: "center",
		gap: theme.gap(1),
	},
	avatar: {
		borderRadius: 44,
		height: 88,
		width: 88,
	},
	name: {
		...theme.type.title,
		color: theme.colors.ink,
		fontSize: 22,
		lineHeight: 28,
		textAlign: "center",
	},
	identitySub: {
		...theme.type.caption,
		color: theme.colors.secondary,
		fontWeight: "400",
		textAlign: "center",
	},
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: theme.gap(1),
		justifyContent: "center",
	},
	section: {
		gap: theme.gap(1),
	},
	sectionTitle: {
		...theme.type.caption,
		color: theme.colors.secondary,
		textTransform: "uppercase",
	},
	row: {
		alignItems: "center",
		flexDirection: "row",
		gap: theme.gap(2),
		justifyContent: "space-between",
		minHeight: 48,
	},
	rowPressed: {
		opacity: 0.6,
	},
	rowBorder: {
		borderTopColor: theme.colors.border,
		borderTopWidth: 1,
	},
	rowLabel: {
		...theme.type.body,
		color: theme.colors.ink,
	},
	rowValue: {
		...theme.type.body,
		color: theme.colors.secondary,
		flexShrink: 1,
	},
	masonry: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: theme.gap(1),
	},
	masonryCell: {
		width: "31.5%",
	},
	masonryCard: {
		aspectRatio: 0.85,
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.card,
		overflow: "hidden",
	},
	masonryImage: {
		height: "100%",
		width: "100%",
	},
	signOut: {
		alignItems: "center",
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.pill,
		justifyContent: "center",
		marginTop: theme.gap(1),
		minHeight: 48,
	},
	signOutPressed: {
		opacity: 0.7,
	},
	signOutLabel: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "600",
	},
}));
