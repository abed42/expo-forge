import * as Updates from "expo-updates";
import { useState } from "react";

declare const __DEV__: boolean;

export type UpdateStatus =
	| "idle"
	| "checking"
	| "available"
	| "downloading"
	| "ready"
	| "error";

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

export function useUpdateStatus(): UseUpdateStatusResult {
	const [status, setStatus] = useState<UpdateStatus>("idle");
	const [error, setError] = useState<Error | null>(null);

	async function check(): Promise<void> {
		if (__DEV__ || !Updates.isEnabled) {
			setStatus("idle");
			setError(null);
			return;
		}

		try {
			setError(null);
			setStatus("checking");

			const update = await Updates.checkForUpdateAsync();

			if (!update.isAvailable) {
				setStatus("idle");
				return;
			}

			setStatus("available");
			setStatus("downloading");
			await Updates.fetchUpdateAsync();
			setStatus("ready");
		} catch (error: unknown) {
			const resolvedError = createError(
				error,
				"[@repo/updates] Failed to check for or fetch an update",
			);

			setError(resolvedError);
			setStatus("error");
		}
	}

	async function reload(): Promise<void> {
		if (__DEV__ || !Updates.isEnabled) {
			setStatus("idle");
			setError(null);
			return;
		}

		try {
			setError(null);
			await Updates.reloadAsync();
		} catch (error: unknown) {
			const resolvedError = createError(
				error,
				"[@repo/updates] Failed to reload the app after an update",
			);

			setError(resolvedError);
			setStatus("error");
		}
	}

	return {
		status,
		error,
		check,
		reload,
	};
}
