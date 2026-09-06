import { describe, expect, it } from "vitest";

import { classifyFeedResponse, type FeedItem } from "./feed-response";

const row: FeedItem = {
	id: "1",
	image_url: null,
	subtitle: null,
	title: "Forged in the open",
};

describe("classifyFeedResponse", () => {
	it("returns the rows when the query succeeds", () => {
		const { reason, result } = classifyFeedResponse({
			data: [row],
			error: null,
			status: 200,
		});

		expect(reason).toBeNull();
		expect(result).toEqual({ fallback: null, items: [row], status: "ready" });
	});

	it("reports an empty table as no-rows", () => {
		const { result } = classifyFeedResponse({
			data: [],
			error: null,
			status: 200,
		});

		expect(result).toEqual({ fallback: "no-rows", items: [], status: "empty" });
	});

	it("treats a PostgREST error as a query failure", () => {
		const { reason, result } = classifyFeedResponse({
			data: null,
			error: { message: 'relation "public.feed_items" does not exist' },
			status: 404,
		});

		expect(reason).toContain("migration 0003");
		expect(result.fallback).toBe("query-failed");
	});

	// postgrest-js swallows fetch failures into `error` with status 0 instead
	// of throwing; an unreachable project must not be blamed on the schema.
	it("treats a transport failure (status 0) as request-failed, not query-failed", () => {
		const { reason, result } = classifyFeedResponse({
			data: null,
			error: { message: "TypeError: Network request failed" },
			status: 0,
		});

		expect(reason).not.toContain("migration");
		expect(result).toEqual({
			fallback: "request-failed",
			items: [],
			status: "error",
		});
	});
});
