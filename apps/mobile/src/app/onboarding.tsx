import { useSSO } from "@repo/auth";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
	Easing,
	FadeIn,
	FadeInUp,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

WebBrowser.maybeCompleteAuthSession();

type SSOStrategy = "oauth_apple" | "oauth_google";

// Fanned-stack layout experiment (scatter version tagged welcome-scatter-v1):
// overlapping cards, alternating rotation, later tiles stack on top.
const TOP_BLOCKS = [
	{
		top: "24%",
		left: "8%",
		width: 100,
		height: 143,
		rotate: "-16deg",
		source: require("../../assets/images/onboarding/collage-1.webp"),
	},
	{
		top: "10%",
		left: "24%",
		width: 106,
		height: 150,
		rotate: "-6deg",
		source: require("../../assets/images/onboarding/collage-2.webp"),
	},
	{
		top: "12%",
		left: "42%",
		width: 106,
		height: 152,
		rotate: "5deg",
		source: require("../../assets/images/onboarding/collage-3.webp"),
	},
	{
		top: "18%",
		left: "56%",
		width: 118,
		height: 157,
		rotate: "13deg",
		source: require("../../assets/images/onboarding/collage-6.png"),
	},
] as const;

const BOTTOM_BLOCKS = [
	{
		top: "22%",
		left: "8%",
		width: 98,
		height: 139,
		rotate: "-14deg",
		source: require("../../assets/images/onboarding/collage-4.webp"),
	},
	{
		top: "8%",
		left: "24%",
		width: 116,
		height: 145,
		rotate: "-4deg",
		source: require("../../assets/images/onboarding/main.webp"),
	},
	{
		top: "16%",
		left: "44%",
		width: 100,
		height: 100,
		rotate: "6deg",
		source: require("../../assets/images/onboarding/collage-7.png"),
	},
	{
		top: "20%",
		left: "60%",
		width: 96,
		height: 120,
		rotate: "15deg",
		source: require("../../assets/images/onboarding/collage-5.webp"),
	},
] as const;

type TileBlock = (typeof TOP_BLOCKS)[number] | (typeof BOTTOM_BLOCKS)[number];

// Each tile fades/scales in staggered, then drifts on a slow sine loop —
// the Cosmos "alive" feel. Amplitude and period vary per tile so the
// collage never moves in lockstep.
function FloatingTile({ block, index }: { block: TileBlock; index: number }) {
	const appear = useSharedValue(0);
	const float = useSharedValue(0);

	useEffect(() => {
		appear.value = withDelay(
			150 + index * 110,
			withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }),
		);
		float.value = withDelay(
			index * 260,
			withRepeat(
				withTiming(1, {
					duration: 4200 + index * 450,
					easing: Easing.inOut(Easing.sin),
				}),
				-1,
				true,
			),
		);
	}, [appear, float, index]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: appear.value,
		transform: [
			{ translateY: (float.value - 0.5) * (5 + (index % 3) * 2) },
			{ rotate: block.rotate },
			{ scale: 0.9 + appear.value * 0.1 },
		],
	}));

	return (
		<Animated.Image
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
				animatedStyle,
			]}
		/>
	);
}

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
			<Animated.View entering={FadeIn.delay(950).duration(550)}>
				<Text style={styles.tagline}>Production grade{"\n"}Expo Template</Text>
			</Animated.View>
			<View style={styles.collage}>
				{TOP_BLOCKS.map((block, index) => (
					<FloatingTile
						block={block}
						index={index + 0}
						key={`${block.top}-${block.left}`}
					/>
				))}
			</View>
			<Animated.Image
				entering={FadeIn.delay(1050).duration(550)}
				resizeMode="contain"
				source={require("../../assets/images/expo-forge-lockup.png")}
				style={styles.logo}
			/>
			<View style={styles.collage}>
				{BOTTOM_BLOCKS.map((block, index) => (
					<FloatingTile
						block={block}
						index={index + 3}
						key={`${block.top}-${block.left}`}
					/>
				))}
			</View>
			<Animated.View
				entering={FadeIn.delay(1250).duration(550)}
				style={styles.footer}
			>
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
			</Animated.View>
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
		borderRadius: 14,
		position: "absolute",
		shadowColor: "#000000",
		shadowOffset: { height: 10, width: 0 },
		shadowOpacity: 0.16,
		shadowRadius: 14,
	},
	logo: {
		alignSelf: "center",
		height: 46,
		tintColor: theme.colors.ink,
		width: 212,
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
		fontWeight: "400",
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
