import * as SecureStore from "expo-secure-store";

/** Home feed layout: single-column list (default) or 2-column masonry grid. */
export type FeedLayout = "list" | "grid";

const KEY = "feed-layout";

export async function loadFeedLayout(): Promise<FeedLayout> {
	const stored = await SecureStore.getItemAsync(KEY).catch(() => null);
	return stored === "grid" ? "grid" : "list";
}

export function saveFeedLayout(layout: FeedLayout) {
	SecureStore.setItemAsync(KEY, layout).catch(() => {
		// Persistence is best-effort: the in-session layout is already applied.
	});
}
