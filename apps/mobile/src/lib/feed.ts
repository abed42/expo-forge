import { useEffect, useState } from "react";

import { classifyFeedResponse, type UseFeedResult } from "./feed-response";
import { useSupabaseClientIfConfigured } from "./supabase";

export type {
	FeedFallback,
	FeedItem,
	FeedStatus,
	UseFeedResult,
} from "./feed-response";

// Keep the skeleton on screen at least this long. Keyless boots resolve
// synchronously, which would skip the loading state entirely — holding it
// briefly is a deliberate demo choice so the shimmer → placeholder handoff
// is visible, not a fake delay on real data (fast fetches still finish
// within the same window).
export const MIN_SKELETON_MS = 500;

// ...and at most this long. A request that hasn't answered by then is
// abandoned and Home falls back to placeholders: an unreachable project takes
// iOS ~7s to give up on its own, which reads as a hung screen.
export const FEED_TIMEOUT_MS = 4000;

// Same inert-when-unset pattern as optional vendor packages: the feed degrades
// to placeholder cards and says why exactly once, then stays quiet.
let hasLoggedFeedFallback = false;

function logFeedFallbackOnce(reason: string): void {
	if (hasLoggedFeedFallback) {
		return;
	}

	console.info(`[feed] Falling back to placeholder items: ${reason}`);
	hasLoggedFeedFallback = true;
}

/**
 * Loads the public demo feed through the Clerk-authenticated Supabase client.
 *
 * Fetches once on mount (newest first, capped at 20, abandoned after
 * `FEED_TIMEOUT_MS`). Never throws: when Supabase env is unset, the
 * table/migration isn't applied yet, or the request fails, it resolves to
 * `"error"` with a `fallback` reason and the Home screen renders explanatory
 * placeholder cards.
 */
export function useFeed(): UseFeedResult {
	// Nullable third-party-auth client: null when the Supabase env vars are
	// unset, so keyless boots degrade to skeletons instead of crashing.
	const supabase = useSupabaseClientIfConfigured();
	const [result, setResult] = useState<UseFeedResult>({
		fallback: null,
		items: [],
		status: "loading",
	});

	useEffect(() => {
		const startedAt = Date.now();
		// Guards setState after unmount (fetch may resolve after navigation).
		let isMounted = true;
		let holdTimer: ReturnType<typeof setTimeout> | undefined;

		// Publishes a result no earlier than MIN_SKELETON_MS after mount.
		const settle = (next: UseFeedResult) => {
			const remaining = MIN_SKELETON_MS - (Date.now() - startedAt);
			if (remaining <= 0) {
				setResult(next);
				return;
			}
			holdTimer = setTimeout(() => {
				if (isMounted) {
					setResult(next);
				}
			}, remaining);
		};

		if (!supabase) {
			logFeedFallbackOnce(
				"EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY are not set.",
			);
			settle({ fallback: "unconfigured", items: [], status: "error" });
			return () => {
				isMounted = false;
				if (holdTimer) {
					clearTimeout(holdTimer);
				}
			};
		}

		// Aborted by the deadline or by unmount; postgrest-js reports either as
		// `error` with status 0, which classifies as request-failed.
		const abort = new AbortController();
		const deadline = setTimeout(() => abort.abort(), FEED_TIMEOUT_MS);

		async function load(client: NonNullable<typeof supabase>) {
			try {
				const response = await client
					.from("feed_items")
					.select("id,title,subtitle,image_url")
					.order("created_at", { ascending: false })
					.limit(20)
					.abortSignal(abort.signal);

				if (!isMounted) {
					return;
				}

				const { reason, result } = classifyFeedResponse(response);
				if (reason) {
					logFeedFallbackOnce(reason);
				}
				settle(result);
			} catch (caught) {
				if (!isMounted) {
					return;
				}

				logFeedFallbackOnce(
					caught instanceof Error ? caught.message : String(caught),
				);
				settle({ fallback: "request-failed", items: [], status: "error" });
			} finally {
				clearTimeout(deadline);
			}
		}

		void load(supabase);

		return () => {
			isMounted = false;
			abort.abort();
			if (holdTimer) {
				clearTimeout(holdTimer);
			}
		};
	}, [supabase]);

	return result;
}
