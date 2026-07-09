import type { PurchasesPackage } from "react-native-purchases";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paymentsKeys } from "./keys";

vi.mock("react-native-purchases", () => ({
	default: {
		configure: vi.fn(),
		getOfferings: vi.fn(() => Promise.resolve({ current: null })),
		purchasePackage: vi.fn(() =>
			Promise.resolve({ productIdentifier: "pro_monthly" }),
		),
		restorePurchases: vi.fn(() => Promise.resolve({ entitlements: {} })),
	},
}));

// usePaywall only needs useState/useEffect; running the effect synchronously
// lets the hook execute in plain node without a React renderer.
vi.mock("react", () => ({
	useState: (initial: unknown) => [initial, () => {}],
	useEffect: (effect: () => undefined | (() => void)) => {
		effect();
	},
}));

const testPackage = { identifier: "monthly" } as PurchasesPackage;

async function loadClient(): Promise<typeof import("./client")> {
	return await import("./client");
}

async function getPurchasesMock() {
	const purchases = await import("react-native-purchases");
	return vi.mocked(purchases.default, { deep: true });
}

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
	vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("paymentsKeys", () => {
	it("accepts a valid RevenueCat API key", () => {
		const result = paymentsKeys.safeParse({
			EXPO_PUBLIC_REVENUECAT_API_KEY: "appl_abc123",
		});

		expect(result.success).toBe(true);
	});

	it("accepts an empty env because the key is optional", () => {
		expect(paymentsKeys.safeParse({}).success).toBe(true);
	});

	it("rejects an empty-string key", () => {
		const result = paymentsKeys.safeParse({
			EXPO_PUBLIC_REVENUECAT_API_KEY: "",
		});

		expect(result.success).toBe(false);
	});

	it("rejects a non-string key", () => {
		const result = paymentsKeys.safeParse({
			EXPO_PUBLIC_REVENUECAT_API_KEY: 42,
		});

		expect(result.success).toBe(false);
	});
});

describe("configurePayments without EXPO_PUBLIC_REVENUECAT_API_KEY", () => {
	it("does not configure Purchases and logs a single console.info", async () => {
		const { configurePayments } = await loadClient();
		const purchases = await getPurchasesMock();

		configurePayments();
		configurePayments();

		expect(purchases.configure).not.toHaveBeenCalled();
		expect(console.info).toHaveBeenCalledTimes(1);
		expect(console.info).toHaveBeenCalledWith(
			expect.stringContaining("EXPO_PUBLIC_REVENUECAT_API_KEY"),
		);
	});
});

describe("configurePayments with EXPO_PUBLIC_REVENUECAT_API_KEY", () => {
	it("configures Purchases with the API key exactly once", async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = "appl_test_key";
		const { configurePayments, isPaymentsConfigured } = await loadClient();
		const purchases = await getPurchasesMock();

		expect(isPaymentsConfigured()).toBe(false);
		configurePayments();
		configurePayments();

		expect(isPaymentsConfigured()).toBe(true);
		expect(purchases.configure).toHaveBeenCalledTimes(1);
		expect(purchases.configure).toHaveBeenCalledWith({
			apiKey: "appl_test_key",
		});
		expect(console.info).not.toHaveBeenCalled();
	});
});

describe("usePaywall without a configured SDK", () => {
	it("stays inert: no offerings fetch, purchase and restore resolve null", async () => {
		const { usePaywall } = await loadClient();
		const purchases = await getPurchasesMock();

		const paywall = usePaywall();

		expect(paywall.isLoading).toBe(false);
		expect(paywall.offerings).toBeNull();
		expect(purchases.getOfferings).not.toHaveBeenCalled();

		await expect(paywall.purchase(testPackage)).resolves.toBeNull();
		await expect(paywall.restore()).resolves.toBeNull();
		expect(purchases.purchasePackage).not.toHaveBeenCalled();
		expect(purchases.restorePurchases).not.toHaveBeenCalled();
	});

	it("stays inert when the key is set but configurePayments was never called", async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = "appl_test_key";
		const { usePaywall } = await loadClient();
		const purchases = await getPurchasesMock();

		const paywall = usePaywall();

		expect(purchases.getOfferings).not.toHaveBeenCalled();
		await expect(paywall.purchase(testPackage)).resolves.toBeNull();
	});
});

describe("usePaywall with a configured SDK", () => {
	it("fetches offerings and forwards purchase and restore to Purchases", async () => {
		process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = "appl_test_key";
		const { configurePayments, usePaywall } = await loadClient();
		const purchases = await getPurchasesMock();

		configurePayments();
		const paywall = usePaywall();

		expect(purchases.getOfferings).toHaveBeenCalledTimes(1);

		const purchaseResult = await paywall.purchase(testPackage);
		expect(purchases.purchasePackage).toHaveBeenCalledWith(testPackage);
		expect(purchaseResult).toEqual({ productIdentifier: "pro_monthly" });

		const restoreResult = await paywall.restore();
		expect(purchases.restorePurchases).toHaveBeenCalledTimes(1);
		expect(restoreResult).toEqual({ entitlements: {} });
	});
});
