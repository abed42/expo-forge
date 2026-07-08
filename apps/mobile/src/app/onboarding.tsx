import { Button } from "@repo/design-system";
import { Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { useSession } from "@/lib/session";

// Placeholder collage: monochrome blocks stand in for imagery until the demo
// data layer lands. Positions echo the scattered-editorial reference.
const TOP_BLOCKS = [
	{ top: "8%", left: "8%", size: 72 },
	{ top: "0%", left: "34%", size: 104 },
	{ top: "14%", left: "60%", size: 88 },
	{ top: "36%", left: "80%", size: 56 },
] as const;

const BOTTOM_BLOCKS = [
	{ top: "10%", left: "6%", size: 84 },
	{ top: "42%", left: "26%", size: 60 },
	{ top: "18%", left: "44%", size: 112 },
	{ top: "8%", left: "78%", size: 68 },
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
					<View
						key={`${block.top}-${block.left}`}
						style={[
							styles.block,
							{
								height: block.size,
								left: block.left,
								top: block.top,
								width: block.size,
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
					<View
						key={`${block.top}-${block.left}`}
						style={[
							styles.block,
							{
								height: block.size,
								left: block.left,
								top: block.top,
								width: block.size,
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
				<View style={styles.dots}>
					<View style={[styles.dot, styles.dotActive]} />
					<View style={styles.dot} />
					<View style={styles.dot} />
					<View style={styles.dot} />
				</View>
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
		borderColor: theme.colors.border,
		borderRadius: 2,
		borderWidth: 1,
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
