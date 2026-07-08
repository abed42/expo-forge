import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observabilityKeys } from "./keys";

vi.mock("@sentry/react-native", () => ({
	init: vi.fn(),
}));

const testDsn = "https://abc123@o111.ingest.sentry.io/222";

async function loadInit(): Promise<typeof import("./init")> {
	return await import("./init");
}

async function getSentryInitMock() {
	const sentry = await import("@sentry/react-native");
	return vi.mocked(sentry.init);
}

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	delete process.env.EXPO_PUBLIC_SENTRY_DSN;
	vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("observabilityKeys", () => {
	it("accepts a valid DSN URL", () => {
		const result = observabilityKeys.safeParse({
			EXPO_PUBLIC_SENTRY_DSN: testDsn,
		});

		expect(result.success).toBe(true);
	});

	it("accepts an empty env because the DSN is optional", () => {
		expect(observabilityKeys.safeParse({}).success).toBe(true);
	});

	it("rejects a DSN that is not a URL", () => {
		const result = observabilityKeys.safeParse({
			EXPO_PUBLIC_SENTRY_DSN: "not-a-url",
		});

		expect(result.success).toBe(false);
	});

	it("rejects a non-string DSN", () => {
		const result = observabilityKeys.safeParse({
			EXPO_PUBLIC_SENTRY_DSN: 123,
		});

		expect(result.success).toBe(false);
	});
});

describe("initObservability without EXPO_PUBLIC_SENTRY_DSN", () => {
	it("does not call Sentry.init and logs a single console.info", async () => {
		const { initObservability } = await loadInit();
		const initMock = await getSentryInitMock();

		initObservability();
		initObservability();

		expect(initMock).not.toHaveBeenCalled();
		expect(console.info).toHaveBeenCalledTimes(1);
		expect(console.info).toHaveBeenCalledWith(
			expect.stringContaining("EXPO_PUBLIC_SENTRY_DSN"),
		);
	});
});

describe("initObservability with EXPO_PUBLIC_SENTRY_DSN", () => {
	it("calls Sentry.init with the DSN, defaults, and caller options", async () => {
		process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
		const { initObservability } = await loadInit();
		const initMock = await getSentryInitMock();

		initObservability({ tracesSampleRate: 0.25 });

		expect(initMock).toHaveBeenCalledTimes(1);
		expect(initMock).toHaveBeenCalledWith({
			dsn: testDsn,
			enableAutoSessionTracking: true,
			enableNativeFramesTracking: true,
			attachStacktrace: true,
			tracesSampleRate: 0.25,
		});
		expect(console.info).not.toHaveBeenCalled();
	});

	it("lets caller options override the defaults", async () => {
		process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
		const { initObservability } = await loadInit();
		const initMock = await getSentryInitMock();

		initObservability({ attachStacktrace: false });

		expect(initMock).toHaveBeenCalledWith(
			expect.objectContaining({ attachStacktrace: false }),
		);
	});

	it("initializes only once across repeated calls", async () => {
		process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
		const { initObservability } = await loadInit();
		const initMock = await getSentryInitMock();

		initObservability();
		initObservability();

		expect(initMock).toHaveBeenCalledTimes(1);
	});

	it("re-exports the Sentry namespace", async () => {
		const { Sentry } = await loadInit();
		const initMock = await getSentryInitMock();

		expect(Sentry.init).toBe(initMock);
	});
});
