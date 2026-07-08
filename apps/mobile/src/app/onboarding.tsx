import { useSSO } from "@repo/auth";
import * as AuthSession from "expo-auth-session";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
	Easing,
	FadeIn,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

WebBrowser.maybeCompleteAuthSession();

// Gate required: some iOS 26 builds lack the API and crash without it.
const canUseGlass = isLiquidGlassAvailable();

type SSOStrategy = "oauth_apple" | "oauth_google";

// Single fanned deck: five cards in an arc, center card largest,
// later tiles stack on top. (Two-band scatter: tag welcome-scatter-v1.)
const DECK_BLOCKS = [
	{
		top: "32%",
		left: "4%",
		width: 110,
		height: 157,
		rotate: "-15deg",
		source: require("../../assets/images/onboarding/collage-1.webp"),
	},
	{
		top: "10%",
		left: "26%",
		width: 124,
		height: 155,
		rotate: "-4deg",
		source: require("../../assets/images/onboarding/main.webp"),
	},
	{
		top: "16%",
		left: "48%",
		width: 114,
		height: 152,
		rotate: "7deg",
		source: require("../../assets/images/onboarding/collage-6.png"),
	},
	{
		top: "34%",
		left: "68%",
		width: 100,
		height: 145,
		rotate: "16deg",
		source: require("../../assets/images/onboarding/collage-8.png"),
	},
] as const;

const PLATFORM_ICONS = [
	{
		key: "apple",
		rotate: "-8deg",
		source: require("../../assets/images/icons/apple.png"),
	},
	{
		key: "android",
		rotate: "6deg",
		source: require("../../assets/images/icons/android.png"),
	},
	{
		key: "expo",
		rotate: "-5deg",
		source: require("../../assets/images/icons/expo.png"),
	},
	{
		key: "react",
		rotate: "9deg",
		source: require("../../assets/images/icons/react.png"),
	},
] as const;

type TileBlock = (typeof DECK_BLOCKS)[number];

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
					duration: 6400 + index * 600,
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
			{ translateY: (float.value - 0.5) * (3 + (index % 3) * 1.5) },
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
			}
			// A dismissed/incomplete SSO sheet is not an error — stay quiet.
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
				<Text style={styles.tagline}>
					Production grade{"\n"}Expo{" "}
					<View style={styles.chipCluster}>
						{PLATFORM_ICONS.map((icon, index) => {
							const placement = {
								marginLeft: index === 0 ? 0 : -7,
								transform: [{ rotate: icon.rotate }],
								zIndex: PLATFORM_ICONS.length - index,
							};
							return canUseGlass ? (
								<GlassView
									glassEffectStyle="regular"
									key={icon.key}
									style={[styles.chipGlass, placement]}
								>
									<Image source={icon.source} style={styles.chipIcon} />
								</GlassView>
							) : (
								<View key={icon.key} style={[styles.chip, placement]}>
									<Image source={icon.source} style={styles.chipIcon} />
								</View>
							);
						})}
					</View>{" "}
					Template
				</Text>
			</Animated.View>
			<View style={styles.spacerTop} />
			<Animated.Image
				entering={FadeIn.delay(1050).duration(550)}
				resizeMode="contain"
				source={require("../../assets/images/expo-forge-lockup.png")}
				style={styles.logo}
			/>
			<View style={styles.collage}>
				{DECK_BLOCKS.map((block, index) => (
					<FloatingTile
						block={block}
						index={index}
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
	chipCluster: {
		flexDirection: "row",
	},
	chip: {
		alignItems: "center",
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.border,
		borderRadius: 9,
		borderWidth: 0.5,
		height: 30,
		justifyContent: "center",
		shadowColor: "#000000",
		shadowOffset: { height: 1, width: 0 },
		shadowOpacity: 0.07,
		shadowRadius: 2.5,
		width: 30,
	},
	chipGlass: {
		alignItems: "center",
		borderRadius: 9,
		height: 30,
		justifyContent: "center",
		overflow: "hidden",
		width: 30,
	},
	chipIcon: {
		height: 18,
		width: 18,
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
	spacerTop: {
		flex: 0.55,
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
