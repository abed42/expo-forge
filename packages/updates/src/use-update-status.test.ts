import { beforeEach, describe, expect, it, vi } from "vitest";

const updatesState = vi.hoisted(() => ({
	isEnabled: true,
	runtimeVersion: "1.0.0" as string | null,
}));

const checkForUpdateAsync = vi.hoisted(() => vi.fn());
const fetchUpdateAsync = vi.hoisted(() => vi.fn());
const reloadAsync = vi.hoisted(() => vi.fn());

vi.mock("expo-updates", () => ({
	get isEnabled() {
		return updatesState.isEnabled;
	},
	get runtimeVersion() {
		return updatesState.runtimeVersion;
	},
	checkForUpdateAsync,
	fetchUpdateAsync,
	reloadAsync,
}));

import {
	runReload,
	runtimeVersion,
	runUpdateCheck,
	type UpdateStatus,
} from "./use-update-status";

function createSink() {
	const statuses: UpdateStatus[] = [];
	const errors: (Error | null)[] = [];

	return {
		statuses,
		errors,
		sink: {
			setStatus(status: UpdateStatus) {
				statuses.push(status);
			},
			setError(error: Error | null) {
				errors.push(error);
			},
		},
	};
}

beforeEach(() => {
	vi.clearAllMocks();

	updatesState.isEnabled = true;
	updatesState.runtimeVersion = "1.0.0";

	checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
	fetchUpdateAsync.mockResolvedValue({ isNew: true });
	reloadAsync.mockResolvedValue(undefined);
});

describe("runUpdateCheck", () => {
	it("stays idle in dev mode without calling expo-updates", async () => {
		const { sink, statuses } = createSink();

		await runUpdateCheck(sink, true);

		expect(statuses).toEqual(["idle"]);
		expect(checkForUpdateAsync).not.toHaveBeenCalled();
		expect(fetchUpdateAsync).not.toHaveBeenCalled();
	});

	it("stays idle when updates are disabled", async () => {
		updatesState.isEnabled = false;
		const { sink, statuses } = createSink();

		await runUpdateCheck(sink, false);

		expect(statuses).toEqual(["idle"]);
		expect(checkForUpdateAsync).not.toHaveBeenCalled();
	});

	it("returns to idle when no update is available", async () => {
		checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
		const { sink, statuses } = createSink();

		await runUpdateCheck(sink, false);

		expect(statuses).toEqual(["checking", "idle"]);
		expect(fetchUpdateAsync).not.toHaveBeenCalled();
	});

	it("walks check → available → downloading → ready when an update exists", async () => {
		checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
		const { sink, statuses, errors } = createSink();

		await runUpdateCheck(sink, false);

		expect(statuses).toEqual(["checking", "available", "downloading", "ready"]);
		expect(fetchUpdateAsync).toHaveBeenCalledTimes(1);
		expect(errors.at(-1)).toBeNull();
	});

	it("captures check failures into state instead of throwing", async () => {
		checkForUpdateAsync.mockRejectedValue(new Error("manifest unreachable"));
		const { sink, statuses, errors } = createSink();

		await expect(runUpdateCheck(sink, false)).resolves.toBeUndefined();

		expect(statuses.at(-1)).toBe("error");
		const captured = errors.at(-1);
		expect(captured).toBeInstanceOf(Error);
		expect(captured?.message).toContain("manifest unreachable");
		expect(captured?.cause).toBeInstanceOf(Error);
	});

	it("captures fetch failures into state instead of throwing", async () => {
		checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
		fetchUpdateAsync.mockRejectedValue(new Error("download interrupted"));
		const { sink, statuses, errors } = createSink();

		await expect(runUpdateCheck(sink, false)).resolves.toBeUndefined();

		expect(statuses.at(-1)).toBe("error");
		expect(errors.at(-1)?.message).toContain("download interrupted");
	});

	it("wraps non-Error rejections in an Error", async () => {
		checkForUpdateAsync.mockRejectedValue("boom");
		const { sink, statuses, errors } = createSink();

		await runUpdateCheck(sink, false);

		expect(statuses.at(-1)).toBe("error");
		const captured = errors.at(-1);
		expect(captured).toBeInstanceOf(Error);
		expect(captured?.message).toContain("[@repo/updates]");
	});
});

describe("runReload", () => {
	it("stays idle in dev mode without reloading", async () => {
		const { sink, statuses } = createSink();

		await runReload(sink, true);

		expect(statuses).toEqual(["idle"]);
		expect(reloadAsync).not.toHaveBeenCalled();
	});

	it("stays idle when updates are disabled", async () => {
		updatesState.isEnabled = false;
		const { sink, statuses } = createSink();

		await runReload(sink, false);

		expect(statuses).toEqual(["idle"]);
		expect(reloadAsync).not.toHaveBeenCalled();
	});

	it("reloads the app when updates are enabled", async () => {
		const { sink, statuses } = createSink();

		await runReload(sink, false);

		expect(reloadAsync).toHaveBeenCalledTimes(1);
		expect(statuses).not.toContain("error");
	});

	it("captures reload failures into state instead of throwing", async () => {
		reloadAsync.mockRejectedValue(new Error("reload blocked"));
		const { sink, statuses, errors } = createSink();

		await expect(runReload(sink, false)).resolves.toBeUndefined();

		expect(statuses.at(-1)).toBe("error");
		expect(errors.at(-1)?.message).toContain("reload blocked");
	});
});

describe("runtimeVersion", () => {
	it("returns the embedded runtime version", () => {
		expect(runtimeVersion()).toBe("1.0.0");
	});

	it("returns null when no runtime version is configured", () => {
		updatesState.runtimeVersion = null;
		expect(runtimeVersion()).toBeNull();
	});
});
