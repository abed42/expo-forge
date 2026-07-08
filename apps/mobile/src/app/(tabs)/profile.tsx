import { useAuth, useUser } from "@repo/auth";
import { Skeleton } from "@repo/design-system";
import { registerForPush } from "@repo/notifications";
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
import { StyleSheet } from "react-native-unistyles";

import {
	APPEARANCE_LABELS,
	type AppearancePreference,
	loadAppearance,
	saveAppearance,
} from "@/lib/appearance";

type Row = {
	label: string;
	value?: string | null;
	onPress?: () => void;
};

type Section = {
	title: string;
	rows: Row[];
};

// Profile is fed entirely by Clerk's client-side user object — every field
// Clerk exposes that makes sense on a settings surface. Absent values render
// skeleton bars instead of empty strings.
const APPEARANCE_OPTIONS: AppearancePreference[] = ["system", "light", "dark"];

// Push registration is session-scoped for now: the row reflects the latest
// attempt, and the token is only logged until a backend delivery phase
// stores it server-side.
type NotificationsValue = "Off" | "Enabled" | "Unavailable" | "Needs setup";

export default function ProfileScreen() {
	const { user, isLoaded } = useUser();
	const { signOut } = useAuth();
	const [appearance, setAppearance] = useState<AppearancePreference>("system");
	const insets = useSafeAreaInsets();
	const [notifications, setNotifications] = useState<NotificationsValue>("Off");

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
			// Backend delivery is a later phase — for now the token only needs to
			// be visible to whoever is wiring up a push provider.
			console.info("[mobile] Expo push token:", result.token);
			setNotifications("Enabled");
			return;
		}

		switch (result.reason) {
			case "simulator":
				setNotifications("Unavailable");
				Alert.alert("Notifications", "Not available in the simulator.");
				break;
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

	const googleAccount = user?.externalAccounts?.find(
		(account) => account.provider === "google",
	);

	const editUsername = () => {
		// iOS-only prompt is fine for the iOS-first template; Android gets a
		// dedicated edit screen when the demo grows one.
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
				} catch (updateError) {
					const message =
						(updateError as { errors?: Array<{ message?: string }> })
							?.errors?.[0]?.message ?? "Could not update username.";
					Alert.alert("Username", message);
				}
			},
			"plain-text",
			user?.username ?? "",
		);
	};

	const sections: Section[] = [
		{
			title: "Account",
			rows: [
				{ label: "Name", value: user?.fullName },
				{ label: "Username", value: user?.username, onPress: editUsername },
				{
					label: "Email",
					value: user?.primaryEmailAddress?.emailAddress,
				},
				{ label: "Phone", value: user?.primaryPhoneNumber?.phoneNumber },
			],
		},
		{
			title: "Connections",
			rows: [
				{
					label: "Google",
					value: googleAccount
						? (googleAccount.emailAddress ?? "Connected")
						: null,
				},
				{ label: "Apple", value: null },
			],
		},
		{
			title: "App",
			rows: [
				{
					label: "Appearance",
					value: APPEARANCE_LABELS[appearance],
					onPress: chooseAppearance,
				},
				{
					label: "Notifications",
					value: notifications,
					onPress: enableNotifications,
				},
			],
		},
		{
			title: "Security",
			rows: [
				{
					label: "Two-factor auth",
					value: user ? (user.twoFactorEnabled ? "On" : "Off") : null,
				},
				{
					label: "Passkeys",
					value: user ? `${user.passkeys?.length ?? 0}` : null,
				},
			],
		},
	];

	return (
		<ScrollView
			// contentInsetAdjustmentBehavior is iOS-only; Android needs the inset applied.
			contentContainerStyle={[
				styles.content,
				Platform.OS === "android" ? { paddingTop: insets.top + 16 } : null,
			]}
			contentInsetAdjustmentBehavior="automatic"
			style={styles.screen}
		>
			<Text style={styles.title}>Profile</Text>

			<View style={styles.identity}>
				{isLoaded && user?.imageUrl ? (
					<Image source={{ uri: user.imageUrl }} style={styles.avatar} />
				) : (
					<Skeleton height={56} radius={28} width={56} />
				)}
				<View style={styles.identityText}>
					{isLoaded && user?.fullName ? (
						<Text style={styles.name}>{user.fullName}</Text>
					) : (
						<Skeleton height={18} width={140} />
					)}
					{isLoaded && user ? (
						<Text style={styles.identitySub}>
							Joined{" "}
							{user.createdAt
								? new Date(user.createdAt).toLocaleDateString(undefined, {
										month: "long",
										year: "numeric",
									})
								: "recently"}
						</Text>
					) : (
						<Skeleton height={13} width={90} />
					)}
				</View>
			</View>

			{sections.map((section) => (
				<View key={section.title} style={styles.section}>
					<Text style={styles.sectionTitle}>{section.title}</Text>
					<View>
						{section.rows.map((row, index) => (
							<Pressable
								disabled={!row.onPress}
								key={row.label}
								onPress={row.onPress}
								style={({ pressed }) => [
									styles.row,
									index > 0 ? styles.rowBorder : null,
									pressed && row.onPress ? styles.rowPressed : null,
								]}
							>
								<Text style={styles.rowLabel}>{row.label}</Text>
								<View style={styles.rowRight}>
									{!isLoaded ? (
										<Skeleton width={110} />
									) : row.value ? (
										<Text numberOfLines={1} style={styles.rowValue}>
											{row.value}
										</Text>
									) : (
										<Skeleton width={110} />
									)}
								</View>
							</Pressable>
						))}
					</View>
				</View>
			))}

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
		gap: theme.gap(2.5),
		padding: theme.gap(3),
		paddingBottom: theme.gap(16),
	},
	title: {
		...theme.type.largeTitle,
		color: theme.colors.ink,
	},
	identity: {
		alignItems: "center",
		flexDirection: "row",
		gap: theme.gap(2),
	},
	avatar: {
		borderRadius: theme.radius.pill,
		height: 56,
		width: 56,
	},
	identityText: {
		flex: 1,
		gap: theme.gap(0.75),
	},
	name: {
		...theme.type.title,
		color: theme.colors.ink,
		fontSize: 20,
		lineHeight: 25,
	},
	identitySub: {
		...theme.type.caption,
		color: theme.colors.secondary,
		fontWeight: "400",
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
	rowRight: {
		alignItems: "center",
		flexDirection: "row",
		flexShrink: 1,
		gap: theme.gap(1),
	},
	rowValue: {
		...theme.type.body,
		color: theme.colors.secondary,
		flexShrink: 1,
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
