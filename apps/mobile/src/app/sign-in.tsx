import { useSignIn, useSignUp } from "@repo/auth";
import { Button, IconButton } from "@repo/design-system";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
	Image,
	KeyboardAvoidingView,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

type Phase = "email" | "code";
type Mode = "signIn" | "signUp";

// Combined email-code sign-in/sign-up on Clerk's Core 3 result-object API:
// unknown emails fall through to sign-up transparently, so one screen serves
// both journeys. finalize() converts the completed attempt into the active
// session, which flips the Stack.Protected guards in _layout.
export default function SignInScreen() {
	const router = useRouter();
	const { theme } = useUnistyles();
	const { signIn } = useSignIn();
	const { signUp } = useSignUp();
	const [phase, setPhase] = useState<Phase>("email");
	const [mode, setMode] = useState<Mode>("signIn");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const continueWithEmail = async () => {
		if (!(signIn && signUp) || busy) {
			return;
		}
		setBusy(true);
		setError(null);

		const sent = await signIn.emailCode.sendCode({ emailAddress: email });
		if (!sent.error) {
			setMode("signIn");
			setPhase("code");
			setBusy(false);
			return;
		}

		// Sign-in failed (most likely no account) — fall through to sign-up.
		const created = await signUp.create({ emailAddress: email });
		if (created.error) {
			setError(created.error.message ?? "Could not start sign-up.");
			setBusy(false);
			return;
		}
		const sentUp = await signUp.verifications.sendEmailCode();
		if (sentUp.error) {
			setError(sentUp.error.message ?? "Could not send the code.");
		} else {
			setMode("signUp");
			setPhase("code");
		}
		setBusy(false);
	};

	const verifyCode = async () => {
		if (!(signIn && signUp) || busy) {
			return;
		}
		setBusy(true);
		setError(null);

		const verified =
			mode === "signIn"
				? await signIn.emailCode.verifyCode({ code })
				: await signUp.verifications.verifyEmailCode({ code });
		// A consumed verification ("already been verified") means the code was
		// accepted on a prior attempt — proceed to finalize instead of dead-ending.
		const alreadyVerified =
			verified.error?.message
				?.toLowerCase()
				.includes("already been verified") ?? false;
		// An existing session means the user IS signed in (stale screen state,
		// e.g. after a dev refresh) — treat as success and let guards flip.
		if (verified.error?.message?.toLowerCase().includes("already signed in")) {
			setBusy(false);
			return;
		}
		if (verified.error && !alreadyVerified) {
			console.error("[auth] verify failed:", JSON.stringify(verified.error));
			setError(verified.error.message ?? "That code didn't work.");
			setBusy(false);
			return;
		}

		const finalized =
			mode === "signIn" ? await signIn.finalize() : await signUp.finalize();
		if (
			finalized.error &&
			!finalized.error.message?.toLowerCase().includes("already signed in")
		) {
			console.error("[auth] finalize failed:", JSON.stringify(finalized.error));
			setError(finalized.error.message ?? "Could not start the session.");
		}
		setBusy(false);
	};

	return (
		<SafeAreaView style={styles.screen}>
			<KeyboardAvoidingView behavior="padding" style={styles.avoider}>
				<View style={styles.header}>
					<IconButton
						accessibilityLabel="Back"
						glass
						onPress={() => router.back()}
					>
						<SymbolView
							name="chevron.left"
							size={17}
							tintColor={theme.colors.ink}
						/>
					</IconButton>
				</View>
				<View style={styles.hero}>
					<Text style={styles.title}>Welcome</Text>
					<Image
						resizeMode="contain"
						source={require("../../assets/images/expo-forge-lockup.png")}
						style={styles.logo}
					/>
					<Text style={styles.subtitle}>
						{phase === "email"
							? "Sign in to sync your collections across devices."
							: `Enter the code we sent to ${email}.`}
					</Text>
					{error ? <Text style={styles.error}>{error}</Text> : null}
				</View>
				<View style={styles.actions}>
					{phase === "email" ? (
						<>
							<TextInput
								autoCapitalize="none"
								autoComplete="email"
								inputMode="email"
								onChangeText={setEmail}
								placeholder="you@example.com"
								style={styles.input}
								value={email}
							/>
							<Button
								disabled={busy || email.length === 0}
								label={busy ? "Sending code…" : "Continue with Email"}
								onPress={continueWithEmail}
							/>
						</>
					) : (
						<>
							<TextInput
								autoComplete="one-time-code"
								inputMode="numeric"
								onChangeText={setCode}
								placeholder="123456"
								style={styles.input}
								value={code}
							/>
							<Button
								disabled={busy || code.length === 0}
								label={busy ? "Verifying…" : "Verify"}
								onPress={verifyCode}
							/>
							<Pressable
								accessibilityRole="button"
								onPress={() => {
									setPhase("email");
									setCode("");
									setError(null);
								}}
								style={styles.secondaryButton}
							>
								<Text style={styles.secondaryLabel}>Use a different email</Text>
							</Pressable>
						</>
					)}
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		backgroundColor: theme.colors.surface,
		flex: 1,
		paddingHorizontal: theme.gap(3),
	},
	avoider: {
		flex: 1,
	},
	header: {
		alignItems: "flex-start",
		paddingTop: theme.gap(1),
	},
	hero: {
		alignItems: "center",
		flex: 1,
		gap: theme.gap(1.5),
		justifyContent: "center",
	},
	logo: {
		height: 52,
		marginBottom: theme.gap(1),
		tintColor: theme.colors.ink,
		width: 240,
	},
	title: {
		...theme.type.title,
		color: theme.colors.ink,
	},
	subtitle: {
		...theme.type.body,
		color: theme.colors.secondary,
		textAlign: "center",
	},
	error: {
		...theme.type.caption,
		color: theme.colors.danger,
		textAlign: "center",
	},
	actions: {
		gap: theme.gap(1.5),
		paddingBottom: theme.gap(2),
	},
	input: {
		...theme.type.body,
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.pill,
		color: theme.colors.ink,
		minHeight: 48,
		paddingHorizontal: theme.gap(2.5),
		textAlign: "center",
	},
	secondaryButton: {
		alignItems: "center",
		justifyContent: "center",
		minHeight: 44,
	},
	ssoButtonPressed: {
		opacity: 0.85,
	},
	secondaryLabel: {
		...theme.type.body,
		color: theme.colors.secondary,
		fontWeight: "600",
	},
}));
