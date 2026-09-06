/**
 * expo-updates throws at import time when `EXUpdatesEnabled` is false, which is
 * the default for debug builds and for any app without an `updates` block. The
 * package must degrade to "no updates available" rather than take down every
 * module that imports it.
 */
import { describe, expect, it, vi } from "vitest";
import { loadUpdatesModule } from "./native-updates";
import {
	runReload,
	runtimeVersion,
	runUpdateCheck,
	type UpdateStatus,
} from "./use-update-status";

vi.mock("./native-updates", () => ({
	loadUpdatesModule: () => null,
}));

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

describe("when the ExpoUpdates native module is missing", () => {
	it("reports no runtime version", () => {
		expect(runtimeVersion()).toBeNull();
	});

	it("stays idle instead of checking for updates", async () => {
		const { sink, statuses, errors } = createSink();

		await expect(runUpdateCheck(sink, false)).resolves.toBeUndefined();

		expect(statuses).toEqual(["idle"]);
		expect(errors.at(-1)).toBeNull();
	});

	it("stays idle instead of reloading", async () => {
		const { sink, statuses, errors } = createSink();

		await expect(runReload(sink, false)).resolves.toBeUndefined();

		expect(statuses).toEqual(["idle"]);
		expect(errors.at(-1)).toBeNull();
	});
});

describe("loadUpdatesModule", () => {
	it("returns null rather than throwing when expo-updates cannot be resolved", async () => {
		const { loadUpdatesModule: load } =
			await vi.importActual<typeof import("./native-updates")>(
				"./native-updates",
			);

		expect(load()).toBeNull();
		expect(loadUpdatesModule()).toBeNull();
	});
});
