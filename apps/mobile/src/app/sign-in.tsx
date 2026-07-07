import { Button } from "@repo/design-system";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { useSession } from "@/lib/session";

// Stub sign-in: both actions mark the session signed in. Replaced by
// @repo/auth (Clerk) flows — Apple SSO + email code — when auth is wired.
export default function SignInScreen() {
	const { signIn } = useSession();

	return (
		<SafeAreaView style={styles.screen}>
			<View style={styles.hero}>
				<Text style={styles.title}>Welcome</Text>
				<Text style={styles.subtitle}>
					Sign in to sync your collections across devices.
				</Text>
			</View>
			<View style={styles.actions}>
				<Button label="Continue with Apple" onPress={signIn} />
				<Pressable
					accessibilityRole="button"
					onPress={signIn}
					style={({ pressed }) => [
						styles.secondaryButton,
						pressed ? styles.secondaryButtonPressed : null,
					]}
				>
					<Text style={styles.secondaryLabel}>Continue with Email</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		backgroundColor: theme.colors.surface,
		flex: 1,
		paddingHorizontal: theme.gap(3),
	},
	hero: {
		alignItems: "center",
		flex: 1,
		gap: theme.gap(1.5),
		justifyContent: "center",
	},
	title: {
		...theme.type.largeTitle,
		color: theme.colors.ink,
	},
	subtitle: {
		...theme.type.body,
		color: theme.colors.secondary,
		textAlign: "center",
	},
	actions: {
		gap: theme.gap(1.5),
		paddingBottom: theme.gap(2),
	},
	secondaryButton: {
		alignItems: "center",
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.pill,
		justifyContent: "center",
		minHeight: 48,
		paddingHorizontal: theme.gap(3),
		paddingVertical: theme.gap(1.5),
	},
	secondaryButtonPressed: {
		opacity: 0.85,
	},
	secondaryLabel: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "600",
	},
}));
