import { Button } from "@repo/design-system";
import { Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { useSession } from "@/lib/session";

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

export default function OnboardingScreen() {
	const { completeOnboarding } = useSession();

	return (
		<SafeAreaView style={styles.screen}>
			<Text style={styles.tagline}>
				Everything wired,{"\n"}nothing to configure
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
				<Text style={styles.legal}>
					By creating an account, you agree to our{"\n"}
					<Text style={styles.legalLink}>Terms of Service</Text> and{" "}
					<Text style={styles.legalLink}>Privacy Policy</Text>
				</Text>
				<Button label="Start" onPress={completeOnboarding} />
				{/* Page dots — re-enable when onboarding becomes a real multi-slide
				    carousel; a static indicator over one page is fake UI.
				<View style={styles.dots}>
					<View style={[styles.dot, styles.dotActive]} />
					<View style={styles.dot} />
					<View style={styles.dot} />
					<View style={styles.dot} />
				</View> */}
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
		borderRadius: 2,
		position: "absolute",
	},
	logo: {
		alignSelf: "center",
		height: 40,
		tintColor: theme.colors.ink,
		width: 185,
	},
	footer: {
		alignItems: "center",
		gap: theme.gap(2),
		paddingBottom: theme.gap(1),
	},
	legal: {
		...theme.type.caption,
		color: theme.colors.secondary,
		fontWeight: "400",
		textAlign: "center",
	},
	legalLink: {
		textDecorationLine: "underline",
	},
	dots: {
		flexDirection: "row",
		gap: theme.gap(1),
		marginTop: theme.gap(1),
	},
	dot: {
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.pill,
		height: 4,
		width: 12,
	},
	dotActive: {
		backgroundColor: theme.colors.ink,
		width: 28,
	},
}));
