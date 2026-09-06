import type { Database } from "@repo/backend";

// Pure types and classification for the Home feed. Kept free of hooks and
// vendor clients so `useFeed`'s decision logic is unit-testable in node.

/** One Home-feed row, exactly as selected from `public.feed_items` (0003). */
export type FeedItem = Pick<
	Database["public"]["Tables"]["feed_items"]["Row"],
	"id" | "title" | "subtitle" | "image_url"
>;

export type FeedStatus = "loading" | "ready" | "empty" | "error";

/**
 * Why the feed has no rows to show. Screens turn this into setup copy, so a
 * blank Home explains itself instead of looking like a stuck loader.
 *
 * - `unconfigured` — Supabase env vars are unset (keyless boot).
 * - `query-failed` — Supabase answered but the query errored (migration 0003
 *   probably isn't applied).
 * - `request-failed` — the request never completed (bad URL, deleted or
 *   paused project, offline).
 * - `no-rows` — everything works; `feed_items` is simply empty.
 */
export type FeedFallback =
	| "unconfigured"
	| "query-failed"
	| "request-failed"
	| "no-rows";

export type UseFeedResult = {
	items: FeedItem[];
	status: FeedStatus;
	/** Set whenever `status` is `"empty"` or `"error"`; null otherwise. */
	fallback: FeedFallback | null;
};

/** The slice of a postgrest-js response the feed needs to classify it. */
export type FeedResponse = {
	data: FeedItem[] | null;
	error: { message: string } | null;
	/** HTTP status; postgrest-js reports `0` when the request never completed. */
	status: number;
};

/**
 * Turns a `feed_items` response into a feed result plus a one-line reason for
 * the console when it fell back.
 *
 * supabase-js never throws on a transport failure (DNS, offline, a deleted or
 * paused project): postgrest-js hands it back as `error` with `status: 0`.
 * Checking for that first keeps an unreachable project from reading as a
 * schema problem — the banner would otherwise send people to apply a
 * migration that isn't the issue.
 */
export function classifyFeedResponse(response: FeedResponse): {
	reason: string | null;
	result: UseFeedResult;
} {
	const { data, error, status } = response;

	if (error && status === 0) {
		return {
			reason: `request failed: ${error.message}`,
			result: { fallback: "request-failed", items: [], status: "error" },
		};
	}

	if (error) {
		return {
			reason: `feed_items query failed (is migration 0003 applied?): ${error.message}`,
			result: { fallback: "query-failed", items: [], status: "error" },
		};
	}

	const items = data ?? [];
	return items.length > 0
		? { reason: null, result: { fallback: null, items, status: "ready" } }
		: {
				reason: null,
				result: { fallback: "no-rows", items: [], status: "empty" },
			};
}
