import { useSSO } from "@repo/auth";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

WebBrowser.maybeCompleteAuthSession();

type SSOStrategy = "oauth_apple" | "oauth_google";

// Editorial collage — two loose bands, varied portrait/square tiles spread
// edge-to-edge with clear gaps, main character largest (Cosmos reference).
const TOP_BLOCKS = [
	{
		top: "46%",
		left: "7%",
		width: 78,
		height: 78,
		source: require("../../assets/images/onboarding/collage-1.webp"),
	},
	{
		top: "16%",
		left: "33%",
		width: 94,
		height: 120,
		source: require("../../assets/images/onboarding/collage-2.webp"),
	},
	{
		top: "40%",
		left: "64%",
		width: 84,
		height: 102,
		source: require("../../assets/images/onboarding/collage-3.webp"),
	},
] as const;

const BOTTOM_BLOCKS = [
	{
		top: "26%",
		left: "8%",
		width: 78,
		height: 94,
		source: require("../../assets/images/onboarding/collage-4.webp"),
	},
	{
		top: "22%",
		left: "40%",
		width: 108,
		height: 134,
		source: require("../../assets/images/onboarding/main.webp"),
	},
	{
		top: "18%",
		left: "76%",
		width: 72,
		height: 66,
		source: require("../../assets/images/onboarding/collage-5.webp"),
	},
] as const;

// Welcome doubles as the auth entry: SSO completes right here (session
// activation flips the guards); the email flow pushes to /sign-in.
export default function WelcomeScreen() {
	const { startSSOFlow } = useSSO();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const continueWithSSO = async (strategy: SSOStrategy) => {
		if (busy) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const { createdSessionId, setActive } = await startSSOFlow({
				strategy,
				redirectUrl: AuthSession.makeRedirectUri(),
			});
			if (createdSessionId && setActive) {
				await setActive({ session: createdSessionId });
			} else {
				setError("This account needs extra steps — continue with email.");
			}
		} catch (ssoError) {
			console.error("[auth] SSO failed:", JSON.stringify(ssoError));
			setError("Could not complete sign-in. Try again.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<SafeAreaView style={styles.screen}>
			<Text style={styles.tagline}>
				Production grade{"\n"}React Native / Expo Template
			</Text>
			<View style={styles.collage}>
				{TOP_BLOCKS.map((block) => (
					<Image
						key={`${block.top}-${block.left}`}
						resizeMode="cover"
						source={block.source}
						style={[
							styles.block,
							{
								height: block.height,
								left: block.left,
								top: block.top,
								width: block.width,
							},
						]}
					/>
				))}
			</View>
			<Image
				resizeMode="contain"
				source={require("../../assets/images/expo-forge-lockup.png")}
				style={styles.logo}
			/>
			<View style={styles.collage}>
				{BOTTOM_BLOCKS.map((block) => (
					<Image
						key={`${block.top}-${block.left}`}
						resizeMode="cover"
						source={block.source}
						style={[
							styles.block,
							{
								height: block.height,
								left: block.left,
								top: block.top,
								width: block.width,
							},
						]}
					/>
				))}
			</View>
			<View style={styles.footer}>
				{error ? <Text style={styles.error}>{error}</Text> : null}
				<Text style={styles.legal}>
					By creating an account, you agree to our{"\n"}
					<Text style={styles.legalLink}>Terms of Service</Text> and{" "}
					<Text style={styles.legalLink}>Privacy Policy</Text>
				</Text>
				<Pressable
					accessibilityRole="button"
					disabled={busy}
					onPress={() => continueWithSSO("oauth_apple")}
					style={({ pressed }) => [
						styles.primaryButton,
						pressed ? styles.buttonPressed : null,
					]}
				>
					<Text style={styles.primaryIcon}>{""}</Text>
					<Text style={styles.primaryLabel}>Continue with Apple</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					disabled={busy}
					onPress={() => continueWithSSO("oauth_google")}
					style={({ pressed }) => [
						styles.secondaryButton,
						pressed ? styles.buttonPressed : null,
					]}
				>
					<Image
						source={require("../../assets/images/google-g.png")}
						style={styles.googleLogo}
					/>
					<Text style={styles.secondaryLabel}>Continue with Google</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					disabled={busy}
					onPress={() => router.push("/sign-in")}
					style={styles.textButton}
				>
					<Text style={styles.textButtonLabel}>Continue with Email</Text>
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
	tagline: {
		...theme.type.title,
		color: theme.colors.ink,
		fontWeight: "500",
		marginTop: theme.gap(4),
		textAlign: "center",
	},
	collage: {
		flex: 1,
		position: "relative",
	},
	block: {
		backgroundColor: theme.colors.fill,
		borderRadius: 12,
		position: "absolute",
	},
	logo: {
		alignSelf: "center",
		height: 40,
		tintColor: theme.colors.ink,
		width: 185,
	},
	footer: {
		alignSelf: "stretch",
		gap: theme.gap(1.5),
		paddingBottom: theme.gap(1),
	},
	error: {
		...theme.type.caption,
		color: theme.colors.secondary,
		textAlign: "center",
	},
	legal: {
		...theme.type.caption,
		color: theme.colors.secondary,
		fontSize: 12.5,
		fontWeight: "400",
		lineHeight: 17,
		marginBottom: theme.gap(0.5),
		textAlign: "center",
	},
	legalLink: {
		textDecorationLine: "underline",
	},
	primaryButton: {
		alignItems: "center",
		backgroundColor: theme.colors.ink,
		borderRadius: theme.radius.pill,
		flexDirection: "row",
		gap: theme.gap(1),
		justifyContent: "center",
		minHeight: 48,
	},
	primaryIcon: {
		color: theme.colors.onInk,
		fontSize: 18,
	},
	primaryLabel: {
		...theme.type.body,
		color: theme.colors.onInk,
		fontWeight: "600",
	},
	secondaryButton: {
		alignItems: "center",
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.pill,
		flexDirection: "row",
		gap: theme.gap(1),
		justifyContent: "center",
		minHeight: 48,
	},
	googleLogo: {
		height: 18,
		width: 18,
	},
	secondaryLabel: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "600",
	},
	textButton: {
		alignItems: "center",
		justifyContent: "center",
		minHeight: 40,
	},
	textButtonLabel: {
		...theme.type.body,
		color: theme.colors.secondary,
		fontWeight: "600",
	},
	buttonPressed: {
		opacity: 0.85,
	},
}));
