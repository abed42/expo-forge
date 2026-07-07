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
let hasLoggedMissingPaymentsKey = false;

// Metro statically inlines process.env.EXPO_PUBLIC_* member expressions in client bundles.
const revenueCatApiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

function logMissingPaymentsKey(): void {
	if (hasLoggedMissingPaymentsKey) {
		return;
	}

	console.info(
		"[@repo/payments] RevenueCat disabled because EXPO_PUBLIC_REVENUECAT_API_KEY is not set.",
	);
	hasLoggedMissingPaymentsKey = true;
}

export function configurePayments(): void {
	if (!revenueCatApiKey) {
		logMissingPaymentsKey();
		return;
	}

	if (hasConfiguredPayments) {
		return;
	}

	Purchases.configure({ apiKey: revenueCatApiKey });
	hasConfiguredPayments = true;
}

export function usePaywall(): UsePaywallResult {
	const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(
		Boolean(revenueCatApiKey && hasConfiguredPayments),
	);

	useEffect(() => {
		let isMounted = true;

		if (!revenueCatApiKey || !hasConfiguredPayments) {
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
				// The stub should stay non-blocking until the demo app lands with full paywall UX and retry handling.
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
		if (!revenueCatApiKey || !hasConfiguredPayments) {
			return null;
		}

		return await Purchases.purchasePackage(pkg);
	}

	async function restore(): Promise<RestoreResult | null> {
		if (!revenueCatApiKey || !hasConfiguredPayments) {
			return null;
		}

		return await Purchases.restorePurchases();
	}

	// The full paywall implementation lands with the demo app; this hook keeps call sites typed in the meantime.
	return {
		offerings,
		isLoading,
		purchase,
		restore,
	};
}
