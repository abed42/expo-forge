import { useAuth, useUser } from "@repo/auth";
import { Skeleton } from "@repo/design-system";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type Row = {
	label: string;
	value?: string | null;
	verified?: boolean;
};

type Section = {
	title: string;
	rows: Row[];
};

// Profile is fed entirely by Clerk's client-side user object — every field
// Clerk exposes that makes sense on a settings surface. Absent values render
// skeleton bars instead of empty strings.
export default function ProfileScreen() {
	const { user, isLoaded } = useUser();
	const { signOut } = useAuth();

	const googleAccount = user?.externalAccounts?.find(
		(account) => account.provider === "google",
	);

	const sections: Section[] = [
		{
			title: "Account",
			rows: [
				{ label: "Name", value: user?.fullName },
				{ label: "Username", value: user?.username },
				{
					label: "Email",
					value: user?.primaryEmailAddress?.emailAddress,
					verified:
						user?.primaryEmailAddress?.verification?.status === "verified",
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
					verified: Boolean(googleAccount),
				},
				{ label: "Apple", value: null },
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
			contentContainerStyle={styles.content}
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
							<View
								key={row.label}
								style={[styles.row, index > 0 ? styles.rowBorder : null]}
							>
								<Text style={styles.rowLabel}>{row.label}</Text>
								<View style={styles.rowRight}>
									{!isLoaded ? (
										<Skeleton width={110} />
									) : row.value ? (
										<>
											{row.verified ? (
												<Text style={styles.verified}>✓</Text>
											) : null}
											<Text numberOfLines={1} style={styles.rowValue}>
												{row.value}
											</Text>
										</>
									) : (
										<Skeleton width={110} />
									)}
								</View>
							</View>
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
	verified: {
		color: theme.colors.secondary,
		fontSize: 13,
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
