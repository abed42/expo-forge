import { useSignIn, useSignUp } from "@repo/auth";
import { Button } from "@repo/design-system";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

type Phase = "email" | "code";
type Mode = "signIn" | "signUp";

function errorMessage(error: unknown): string {
	const clerkError = error as { errors?: Array<{ message?: string }> };
	return clerkError?.errors?.[0]?.message ?? "Something went wrong. Try again.";
}

// Combined email-code sign-in/sign-up: unknown emails fall through to
// sign-up transparently, so one screen serves both journeys.
export default function SignInScreen() {
	const { signIn, setActive: setActiveSignIn, isLoaded } = useSignIn();
	const { signUp, setActive: setActiveSignUp } = useSignUp();
	const [phase, setPhase] = useState<Phase>("email");
	const [mode, setMode] = useState<Mode>("signIn");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const continueWithEmail = async () => {
		if (!(isLoaded && signIn && signUp) || busy) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const attempt = await signIn.create({ identifier: email });
			const factor = attempt.supportedFirstFactors?.find(
				(candidate) => candidate.strategy === "email_code",
			);
			if (factor && "emailAddressId" in factor) {
				await signIn.prepareFirstFactor({
					emailAddressId: factor.emailAddressId,
					strategy: "email_code",
				});
				setMode("signIn");
				setPhase("code");
			} else {
				setError("Email codes are not enabled for this Clerk app.");
			}
		} catch {
			try {
				await signUp.create({ emailAddress: email });
				await signUp.prepareEmailAddressVerification({
					strategy: "email_code",
				});
				setMode("signUp");
				setPhase("code");
			} catch (signUpError) {
				setError(errorMessage(signUpError));
			}
		} finally {
			setBusy(false);
		}
	};

	const verifyCode = async () => {
		if (!(isLoaded && signIn && signUp) || busy) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			if (mode === "signIn") {
				const attempt = await signIn.attemptFirstFactor({
					code,
					strategy: "email_code",
				});
				if (attempt.status === "complete") {
					await setActiveSignIn({ session: attempt.createdSessionId });
				} else {
					setError("Additional verification required — check Clerk settings.");
				}
			} else {
				const attempt = await signUp.attemptEmailAddressVerification({ code });
				if (attempt.status === "complete") {
					await setActiveSignUp({ session: attempt.createdSessionId });
				} else {
					setError("Sign-up needs more steps — check Clerk settings.");
				}
			}
		} catch (verifyError) {
			setError(errorMessage(verifyError));
		} finally {
			setBusy(false);
		}
	};

	return (
		<SafeAreaView style={styles.screen}>
			<View style={styles.hero}>
				<Text style={styles.title}>Welcome</Text>
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
						<Pressable
							accessibilityRole="button"
							onPress={() =>
								setError(
									"Apple SSO ships with the SSO phase — enable the provider in your Clerk dashboard first.",
								)
							}
							style={styles.secondaryButton}
						>
							<Text style={styles.secondaryLabel}>Continue with Apple</Text>
						</Pressable>
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
	error: {
		...theme.type.caption,
		color: "#B3261E",
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
	secondaryLabel: {
		...theme.type.body,
		color: theme.colors.secondary,
		fontWeight: "600",
	},
}));
