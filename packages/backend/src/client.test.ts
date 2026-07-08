import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
	createClient: createClientMock,
}));

const SUPABASE_URL = "https://unit-test.supabase.co";
const SUPABASE_KEY = "sb_publishable_unit_test";

// client.ts keeps a module-level singleton, so every test re-imports a fresh
// copy of the module (vi.resetModules) instead of sharing singleton state.
async function importClient() {
	return await import("./client");
}

describe("@repo/backend client", () => {
	beforeEach(() => {
		vi.resetModules();
		createClientMock.mockReset();
		createClientMock.mockImplementation(() => ({ id: Symbol("client") }));

		vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", SUPABASE_URL);
		vi.stubEnv("EXPO_PUBLIC_SUPABASE_KEY", SUPABASE_KEY);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe("isSupabaseConfigured", () => {
		it("returns true when both env vars are set", async () => {
			const { isSupabaseConfigured } = await importClient();

			expect(isSupabaseConfigured()).toBe(true);
		});

		it("returns false when the URL is unset", async () => {
			vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", undefined);

			const { isSupabaseConfigured } = await importClient();

			expect(isSupabaseConfigured()).toBe(false);
		});

		it("returns false when the key is unset", async () => {
			vi.stubEnv("EXPO_PUBLIC_SUPABASE_KEY", undefined);

			const { isSupabaseConfigured } = await importClient();

			expect(isSupabaseConfigured()).toBe(false);
		});
	});

	describe("createSupabaseClient — third-party auth mode", () => {
		it("passes the token getter through and omits auth options", async () => {
			const getToken = vi.fn(async () => "clerk-jwt");
			const { createSupabaseClient } = await importClient();

			createSupabaseClient({ accessToken: getToken });

			expect(createClientMock).toHaveBeenCalledExactlyOnceWith(
				SUPABASE_URL,
				SUPABASE_KEY,
				{ accessToken: getToken },
			);
			expect(createClientMock.mock.calls[0]?.[2]).not.toHaveProperty("auth");
		});

		it("ignores auth-mode storage options when accessToken is set", async () => {
			const { createSupabaseClient } = await importClient();

			createSupabaseClient({
				accessToken: async () => null,
				storage: {
					getItem: vi.fn(),
					setItem: vi.fn(),
					removeItem: vi.fn(),
				},
				storageKey: "should-be-ignored",
			});

			const options = createClientMock.mock.calls[0]?.[2];
			expect(options).not.toHaveProperty("storage");
			expect(options).not.toHaveProperty("storageKey");
		});

		it("creates a new client per call instead of a singleton", async () => {
			const { createSupabaseClient } = await importClient();

			const first = createSupabaseClient({ accessToken: async () => "a" });
			const second = createSupabaseClient({ accessToken: async () => "b" });

			expect(createClientMock).toHaveBeenCalledTimes(2);
			expect(first).not.toBe(second);
		});
	});

	describe("createSupabaseClient — Supabase-Auth mode", () => {
		it("returns the same singleton instance across calls", async () => {
			const { createSupabaseClient } = await importClient();

			const first = createSupabaseClient();
			const second = createSupabaseClient();

			expect(createClientMock).toHaveBeenCalledTimes(1);
			expect(first).toBe(second);
		});

		it("configures session-less defaults when no storage is provided", async () => {
			const { createSupabaseClient } = await importClient();

			createSupabaseClient();

			expect(createClientMock).toHaveBeenCalledWith(
				SUPABASE_URL,
				SUPABASE_KEY,
				{
					auth: {
						storage: undefined,
						storageKey: "expo-forge-auth",
						autoRefreshToken: true,
						persistSession: false,
						detectSessionInUrl: false,
					},
				},
			);
		});

		it("persists the session when storage is provided", async () => {
			const storage = {
				getItem: vi.fn(),
				setItem: vi.fn(),
				removeItem: vi.fn(),
			};
			const { createSupabaseClient } = await importClient();

			createSupabaseClient({ storage, storageKey: "custom-key" });

			const options = createClientMock.mock.calls[0]?.[2] as {
				auth: Record<string, unknown>;
			};
			expect(options.auth.storage).toBe(storage);
			expect(options.auth.storageKey).toBe("custom-key");
			expect(options.auth.persistSession).toBe(true);
		});
	});

	describe("createSupabaseClient — missing environment", () => {
		it("throws naming EXPO_PUBLIC_SUPABASE_URL when the URL is unset", async () => {
			vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", undefined);
			const { createSupabaseClient } = await importClient();

			expect(() => createSupabaseClient()).toThrowError(
				/EXPO_PUBLIC_SUPABASE_URL/,
			);
			expect(createClientMock).not.toHaveBeenCalled();
		});

		it("throws naming EXPO_PUBLIC_SUPABASE_KEY when the key is unset", async () => {
			vi.stubEnv("EXPO_PUBLIC_SUPABASE_KEY", undefined);
			const { createSupabaseClient } = await importClient();

			expect(() => createSupabaseClient()).toThrowError(
				/EXPO_PUBLIC_SUPABASE_KEY/,
			);
			expect(createClientMock).not.toHaveBeenCalled();
		});

		it("throws in third-party auth mode too", async () => {
			vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", undefined);
			const { createSupabaseClient } = await importClient();

			expect(() =>
				createSupabaseClient({ accessToken: async () => null }),
			).toThrowError(/EXPO_PUBLIC_SUPABASE_URL/);
		});
	});

	describe("createClerkSupabaseClient", () => {
		it("delegates to the third-party auth factory with the getter", async () => {
			const getToken = vi.fn(async () => "clerk-jwt");
			const { createClerkSupabaseClient } = await importClient();

			const client = createClerkSupabaseClient(getToken);

			expect(createClientMock).toHaveBeenCalledExactlyOnceWith(
				SUPABASE_URL,
				SUPABASE_KEY,
				{ accessToken: getToken },
			);
			expect(client).toBe(createClientMock.mock.results[0]?.value);
		});
	});
});
