import { useEffect, useState } from "react";
import Purchases, {
	type PurchasesOffering,
	type PurchasesPackage,
} from "react-native-purchases";

export type PurchaseResult = Awaited<
	ReturnType<typeof Purchases.purchasePackage>
>;
export type RestoreResult = Awaited<
	ReturnType<typeof Purchases.restorePurchases>
>;

export type UsePaywallResult = {
	offerings: PurchasesOffering | null;
	isLoading: boolean;
	purchase: (pkg: PurchasesPackage) => Promise<PurchaseResult | null>;
	restore: () => Promise<RestoreResult | null>;
};

let hasConfiguredPayments = false;
let hasLoggedDisabledPayments = false;

// Metro statically inlines process.env.EXPO_PUBLIC_* member expressions in client bundles.
const revenueCatApiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

function logDisabledOnce(reason: string): void {
	if (hasLoggedDisabledPayments) {
		return;
	}

	console.info(`[@repo/payments] RevenueCat disabled: ${reason}`);
	hasLoggedDisabledPayments = true;
}

function isNativeModuleMissing(error: unknown): boolean {
	const message = String((error as { message?: string })?.message ?? error);
	return /Native module \(RNPurchases\) not found|RNPurchases/i.test(message);
}

/** Configures RevenueCat when available; otherwise leaves payments inert. */
export function configurePayments(): void {
	if (!revenueCatApiKey) {
		logDisabledOnce("EXPO_PUBLIC_REVENUECAT_API_KEY is not set.");
		return;
	}

	if (hasConfiguredPayments) {
		return;
	}

	try {
		Purchases.configure({ apiKey: revenueCatApiKey });
		hasConfiguredPayments = true;
	} catch (error) {
		if (isNativeModuleMissing(error)) {
			logDisabledOnce(
				"native module RNPurchases not in this binary — rebuild the dev client (`cd apps/mobile && bun ios`).",
			);
			return;
		}

		logDisabledOnce(
			error instanceof Error ? error.message : "Purchases.configure failed.",
		);
	}
}

/** True once a key is present and `configurePayments()` has run successfully. */
export function isPaymentsConfigured(): boolean {
	return hasConfiguredPayments;
}

export type PaymentsStatus = "ready" | "missing-key" | "needs-native-rebuild";

/** Distinguishes “no key” from “key set but RNPurchases not in this binary”. */
export function getPaymentsStatus(): PaymentsStatus {
	if (hasConfiguredPayments) {
		return "ready";
	}
	if (!revenueCatApiKey) {
		return "missing-key";
	}
	return "needs-native-rebuild";
}

export function usePaywall(): UsePaywallResult {
	const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(isPaymentsConfigured());

	useEffect(() => {
		let isMounted = true;

		if (!isPaymentsConfigured()) {
			setIsLoading(false);
			return () => {
				isMounted = false;
			};
		}

		void Purchases.getOfferings()
			.then((result) => {
				if (!isMounted) {
					return;
				}

				setOfferings(result.current);
			})
			.catch(() => {
				if (!isMounted) {
					return;
				}

				setOfferings(null);
			})
			.finally(() => {
				if (!isMounted) {
					return;
				}

				setIsLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, []);

	async function purchase(
		pkg: PurchasesPackage,
	): Promise<PurchaseResult | null> {
		if (!isPaymentsConfigured()) {
			return null;
		}

		return Purchases.purchasePackage(pkg);
	}

	async function restore(): Promise<RestoreResult | null> {
		if (!isPaymentsConfigured()) {
			return null;
		}

		return Purchases.restorePurchases();
	}

	return {
		offerings,
		isLoading,
		purchase,
		restore,
	};
}
