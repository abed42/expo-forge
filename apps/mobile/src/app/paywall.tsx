import { Button, IconButton, Skeleton } from "@repo/design-system";
import {
	isPaymentsConfigured,
	type PurchaseResult,
	usePaywall,
} from "@repo/payments";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
	Alert,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

function packageLabel(pkg: PurchasesPackage): string {
	const title = pkg.product.title?.trim();
	if (title) {
		return title;
	}
	return pkg.identifier;
}

function packagePrice(pkg: PurchasesPackage): string {
	return pkg.product.priceString || "—";
}

function isUserCancelled(error: unknown): boolean {
	const code = (error as { userCancelled?: boolean; code?: number | string })
		?.userCancelled;
	if (code === true) {
		return true;
	}
	const message = String((error as { message?: string })?.message ?? "");
	return /cancel/i.test(message);
}

export default function PaywallScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { theme } = useUnistyles();
	const configured = isPaymentsConfigured();
	const { offerings, isLoading, purchase, restore } = usePaywall();
	const [busyId, setBusyId] = useState<string | null>(null);

	const packages = offerings?.availablePackages ?? [];

	const onPurchase = async (pkg: PurchasesPackage) => {
		if (busyId) {
			return;
		}
		setBusyId(pkg.identifier);
		try {
			const result: PurchaseResult | null = await purchase(pkg);
			if (result) {
				Alert.alert("Purchased", "Thanks — entitlement unlocked.");
			}
		} catch (error) {
			if (!isUserCancelled(error)) {
				Alert.alert(
					"Purchase failed",
					(error as { message?: string })?.message ??
						"Could not complete the purchase.",
				);
			}
		} finally {
			setBusyId(null);
		}
	};

	const onRestore = async () => {
		if (busyId) {
			return;
		}
		setBusyId("restore");
		try {
			const result = await restore();
			if (!result) {
				Alert.alert(
					"Restore",
					"RevenueCat isn't configured. Add EXPO_PUBLIC_REVENUECAT_API_KEY to apps/mobile/.env.local.",
				);
				return;
			}
			const active = Object.keys(result.entitlements.active);
			Alert.alert(
				"Restored",
				active.length > 0
					? `Active: ${active.join(", ")}`
					: "No active entitlements found for this Apple/Google account.",
			);
		} catch (error) {
			if (!isUserCancelled(error)) {
				Alert.alert(
					"Restore failed",
					(error as { message?: string })?.message ??
						"Could not restore purchases.",
				);
			}
		} finally {
			setBusyId(null);
		}
	};

	return (
		<View style={styles.screen}>
			<Stack.Screen options={{ headerShown: false }} />
			<View
				style={[
					styles.chrome,
					{
						paddingTop: insets.top + theme.gap(1),
						paddingHorizontal: theme.gap(2),
					},
				]}
			>
				<IconButton
					accessibilityLabel="Back"
					glass
					onPress={() => router.back()}
				>
					<SymbolView
						name={Platform.OS === "ios" ? "chevron.left" : "arrow.left"}
						size={17}
						tintColor={theme.colors.ink}
					/>
				</IconButton>
			</View>

			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingBottom: insets.bottom + theme.gap(8) },
				]}
				contentInsetAdjustmentBehavior="automatic"
			>
				<Text style={styles.title}>Pro</Text>
				<Text style={styles.subtitle}>
					Demo paywall wired to RevenueCat. Add your public SDK key and
					configure an offering in the dashboard to see real packages.
				</Text>

				{!configured ? (
					<View style={styles.empty}>
						<Text style={styles.emptyTitle}>Payments not configured</Text>
						<Text style={styles.emptyBody}>
							Set EXPO_PUBLIC_REVENUECAT_API_KEY in apps/mobile/.env.local
							(appl_… on iOS, goog_… on Android), then reload. Until then this
							screen stays inert — same pattern as analytics and Sentry.
						</Text>
					</View>
				) : isLoading ? (
					<View style={styles.packages}>
						<View style={styles.skeletonRow}>
							<Skeleton height={18} width={160} />
							<Skeleton height={18} width={64} />
						</View>
						<View style={styles.skeletonRow}>
							<Skeleton height={18} width={140} />
							<Skeleton height={18} width={56} />
						</View>
					</View>
				) : packages.length === 0 ? (
					<View style={styles.empty}>
						<Text style={styles.emptyTitle}>No packages yet</Text>
						<Text style={styles.emptyBody}>
							Key is set, but RevenueCat returned no current offering. Create a
							product + offering in the RevenueCat dashboard and mark it
							Current.
						</Text>
					</View>
				) : (
					<View style={styles.packages}>
						{packages.map((pkg) => {
							const selected = busyId === pkg.identifier;
							return (
								<Pressable
									disabled={Boolean(busyId)}
									key={pkg.identifier}
									onPress={() => void onPurchase(pkg)}
									style={({ pressed }) => [
										styles.packageRow,
										pressed ? styles.packagePressed : null,
										busyId && !selected ? styles.packageDimmed : null,
									]}
								>
									<View style={styles.packageText}>
										<Text style={styles.packageTitle}>{packageLabel(pkg)}</Text>
										{pkg.product.description ? (
											<Text numberOfLines={2} style={styles.packageDesc}>
												{pkg.product.description}
											</Text>
										) : null}
									</View>
									<Text style={styles.packagePrice}>
										{selected ? "…" : packagePrice(pkg)}
									</Text>
								</Pressable>
							);
						})}
					</View>
				)}

				<Button
					disabled={Boolean(busyId) || !configured}
					label={busyId === "restore" ? "Restoring…" : "Restore purchases"}
					onPress={() => void onRestore()}
				/>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		backgroundColor: theme.colors.surface,
		flex: 1,
	},
	chrome: {
		flexDirection: "row",
	},
	content: {
		gap: theme.gap(3),
		paddingHorizontal: theme.gap(3),
		paddingTop: theme.gap(2),
	},
	title: {
		...theme.type.largeTitle,
		color: theme.colors.ink,
	},
	subtitle: {
		...theme.type.body,
		color: theme.colors.secondary,
	},
	packages: {
		gap: theme.gap(1.5),
	},
	skeletonRow: {
		alignItems: "center",
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.card,
		flexDirection: "row",
		justifyContent: "space-between",
		minHeight: 72,
		paddingHorizontal: theme.gap(2),
	},
	packageRow: {
		alignItems: "center",
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.card,
		flexDirection: "row",
		gap: theme.gap(2),
		justifyContent: "space-between",
		minHeight: 72,
		paddingHorizontal: theme.gap(2),
		paddingVertical: theme.gap(1.5),
	},
	packagePressed: {
		opacity: 0.75,
	},
	packageDimmed: {
		opacity: 0.45,
	},
	packageText: {
		flex: 1,
		gap: theme.gap(0.5),
	},
	packageTitle: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "600",
	},
	packageDesc: {
		...theme.type.caption,
		color: theme.colors.secondary,
	},
	packagePrice: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "700",
	},
	empty: {
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.card,
		gap: theme.gap(1),
		padding: theme.gap(2.5),
	},
	emptyTitle: {
		...theme.type.body,
		color: theme.colors.ink,
		fontWeight: "600",
	},
	emptyBody: {
		...theme.type.caption,
		color: theme.colors.secondary,
	},
}));
