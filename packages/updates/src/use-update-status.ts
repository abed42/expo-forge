import * as Updates from "expo-updates";
import { useCallback, useState } from "react";

declare const __DEV__: boolean;

export type UpdateStatus =
	| "idle"
	| "checking"
	| "available"
	| "downloading"
	| "ready"
	| "error";

export type UpdateStatusSink = {
	setStatus(status: UpdateStatus): void;
	setError(error: Error | null): void;
};

export type UseUpdateStatusResult = {
	status: UpdateStatus;
	error: Error | null;
	check(): Promise<void>;
	reload(): Promise<void>;
};

function createError(error: unknown, context: string): Error {
	if (error instanceof Error) {
		return new Error(`${context}: ${error.message}`, { cause: error });
	}

	return new Error(context);
}

export function runtimeVersion(): string | null {
	return Updates.runtimeVersion ?? null;
}

/**
 * Core check → fetch state machine behind `useUpdateStatus`.
 * Exported so the logic can be exercised outside of a React renderer.
 */
export async function runUpdateCheck(
	sink: UpdateStatusSink,
	isDev: boolean,
): Promise<void> {
	if (isDev || !Updates.isEnabled) {
		sink.setStatus("idle");
		sink.setError(null);
		return;
	}

	try {
		sink.setError(null);
		sink.setStatus("checking");

		const update = await Updates.checkForUpdateAsync();

		if (!update.isAvailable) {
			sink.setStatus("idle");
			return;
		}

		sink.setStatus("available");
		sink.setStatus("downloading");
		await Updates.fetchUpdateAsync();
		sink.setStatus("ready");
	} catch (error: unknown) {
		sink.setError(
			createError(
				error,
				"[@repo/updates] Failed to check for or fetch an update",
			),
		);
		sink.setStatus("error");
	}
}

/**
 * Core reload routine behind `useUpdateStatus`.
 * Exported so the logic can be exercised outside of a React renderer.
 */
export async function runReload(
	sink: UpdateStatusSink,
	isDev: boolean,
): Promise<void> {
	if (isDev || !Updates.isEnabled) {
		sink.setStatus("idle");
		sink.setError(null);
		return;
	}

	try {
		sink.setError(null);
		await Updates.reloadAsync();
	} catch (error: unknown) {
		sink.setError(
			createError(
				error,
				"[@repo/updates] Failed to reload the app after an update",
			),
		);
		sink.setStatus("error");
	}
}

export function useUpdateStatus(): UseUpdateStatusResult {
	const [status, setStatus] = useState<UpdateStatus>("idle");
	const [error, setError] = useState<Error | null>(null);

	const check = useCallback(
		() => runUpdateCheck({ setStatus, setError }, __DEV__),
		[],
	);

	const reload = useCallback(
		() => runReload({ setStatus, setError }, __DEV__),
		[],
	);

	return {
		status,
		error,
		check,
		reload,
	};
}
