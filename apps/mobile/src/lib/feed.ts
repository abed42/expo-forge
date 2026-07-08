import type { Database } from "@repo/backend";
import { useEffect, useState } from "react";

import { useSupabaseClientIfConfigured } from "./supabase";

/** One Home-feed row, exactly as selected from `public.feed_items` (0003). */
export type FeedItem = Pick<
	Database["public"]["Tables"]["feed_items"]["Row"],
	"id" | "title" | "subtitle" | "image_url"
>;

export type FeedStatus = "loading" | "ready" | "empty" | "error";

export type UseFeedResult = {
	items: FeedItem[];
	status: FeedStatus;
};

// Inert-when-unset pattern (see @repo/payments, @repo/analytics): the feed
// degrades to skeleton placeholders and says why exactly once, then stays
// quiet.
let hasLoggedFeedFallback = false;

function logFeedFallbackOnce(reason: string): void {
	if (hasLoggedFeedFallback) {
		return;
	}

	console.info(`[feed] Falling back to skeleton items: ${reason}`);
	hasLoggedFeedFallback = true;
}

/**
 * Loads the public demo feed through the Clerk-authenticated Supabase client.
 *
 * Fetches once on mount (newest first, capped at 20). Never throws: when
 * Supabase env is unset, the table/migration isn't applied yet, or the
 * request fails, it resolves to `"error"` and the Home screen keeps its
 * skeleton placeholders.
 */
export function useFeed(): UseFeedResult {
	// Nullable third-party-auth client: null when the Supabase env vars are
	// unset, so keyless boots degrade to skeletons instead of crashing.
	const supabase = useSupabaseClientIfConfigured();
	const [result, setResult] = useState<UseFeedResult>({
		items: [],
		status: "loading",
	});

	useEffect(() => {
		if (!supabase) {
			logFeedFallbackOnce(
				"EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY are not set.",
			);
			setResult({ items: [], status: "error" });
			return;
		}

		// Guards setState after unmount (fetch may resolve after navigation).
		let isMounted = true;

		async function load(client: NonNullable<typeof supabase>) {
			try {
				const { data, error } = await client
					.from("feed_items")
					.select("id,title,subtitle,image_url")
					.order("created_at", { ascending: false })
					.limit(20);

				if (!isMounted) {
					return;
				}

				if (error) {
					logFeedFallbackOnce(
						`feed_items query failed (is migration 0003 applied?): ${error.message}`,
					);
					setResult({ items: [], status: "error" });
					return;
				}

				setResult(
					data.length > 0
						? { items: data, status: "ready" }
						: { items: [], status: "empty" },
				);
			} catch (caught) {
				if (!isMounted) {
					return;
				}

				logFeedFallbackOnce(
					caught instanceof Error ? caught.message : String(caught),
				);
				setResult({ items: [], status: "error" });
			}
		}

		void load(supabase);

		return () => {
			isMounted = false;
		};
	}, [supabase]);

	return result;
}
