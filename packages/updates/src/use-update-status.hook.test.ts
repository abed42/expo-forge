/**
 * Exercises the `useUpdateStatus` hook itself through a minimal manual
 * hook harness (mocked `useState`/`useCallback`), verifying that the hook
 * wires its state setters and the `__DEV__` flag into the core routines.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => {
	const slots: unknown[] = [];
	let cursor = 0;

	return {
		reset() {
			slots.length = 0;
			cursor = 0;
		},
		render<T>(hook: () => T): T {
			cursor = 0;
			return hook();
		},
		useState(initial: unknown) {
			const index = cursor;
			cursor += 1;

			if (!(index in slots)) {
				slots[index] = initial;
			}

			const setter = (value: unknown) => {
				slots[index] = value;
			};

			return [slots[index], setter] as const;
		},
	};
});

const checkForUpdateAsync = vi.hoisted(() => vi.fn());
const fetchUpdateAsync = vi.hoisted(() => vi.fn());
const reloadAsync = vi.hoisted(() => vi.fn());

vi.mock("react", () => ({
	useState: (initial: unknown) => harness.useState(initial),
	useCallback: <T>(callback: T) => callback,
}));

vi.mock("expo-updates", () => ({
	isEnabled: true,
	runtimeVersion: "1.0.0",
	checkForUpdateAsync,
	fetchUpdateAsync,
	reloadAsync,
}));

import { useUpdateStatus } from "./use-update-status";

type DevGlobal = { __DEV__?: boolean };

describe("useUpdateStatus (hook wiring)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		harness.reset();

		(globalThis as DevGlobal).__DEV__ = false;
		checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
		fetchUpdateAsync.mockResolvedValue({ isNew: true });
	});

	afterEach(() => {
		(globalThis as DevGlobal).__DEV__ = undefined;
	});

	it("starts idle with no error", () => {
		const result = harness.render(useUpdateStatus);

		expect(result.status).toBe("idle");
		expect(result.error).toBeNull();
	});

	it("reaches 'ready' after check() finds and fetches an update", async () => {
		const first = harness.render(useUpdateStatus);

		await first.check();

		const second = harness.render(useUpdateStatus);
		expect(second.status).toBe("ready");
		expect(second.error).toBeNull();
		expect(fetchUpdateAsync).toHaveBeenCalledTimes(1);
	});

	it("honours the __DEV__ guard through the hook", async () => {
		(globalThis as DevGlobal).__DEV__ = true;

		const first = harness.render(useUpdateStatus);
		await first.check();

		const second = harness.render(useUpdateStatus);
		expect(second.status).toBe("idle");
		expect(checkForUpdateAsync).not.toHaveBeenCalled();
	});

	it("captures check errors into hook state", async () => {
		checkForUpdateAsync.mockRejectedValue(new Error("offline"));

		const first = harness.render(useUpdateStatus);
		await first.check();

		const second = harness.render(useUpdateStatus);
		expect(second.status).toBe("error");
		expect(second.error?.message).toContain("offline");
	});
});
