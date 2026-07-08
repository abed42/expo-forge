import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockPermissions = { status: string; canAskAgain?: boolean };

const mockState = vi.hoisted(() => ({
	isDevice: true,
	platformOS: "ios",
	expoConfig: null as unknown,
	easConfig: null as unknown,
}));

const setNotificationChannelAsync = vi.hoisted(() => vi.fn());
const getPermissionsAsync = vi.hoisted(() => vi.fn());
const requestPermissionsAsync = vi.hoisted(() => vi.fn());
const getExpoPushTokenAsync = vi.hoisted(() => vi.fn());

vi.mock("expo-device", () => ({
	get isDevice() {
		return mockState.isDevice;
	},
}));

vi.mock("expo-constants", () => ({
	default: {
		get expoConfig() {
			return mockState.expoConfig;
		},
		get easConfig() {
			return mockState.easConfig;
		},
	},
}));

vi.mock("react-native", () => ({
	Platform: {
		get OS() {
			return mockState.platformOS;
		},
	},
}));

vi.mock("expo-notifications", () => ({
	AndroidImportance: { DEFAULT: 3 },
	setNotificationChannelAsync,
	getPermissionsAsync,
	requestPermissionsAsync,
	getExpoPushTokenAsync,
}));

import { registerForPush } from "./register";

const PROJECT_ID = "11111111-2222-3333-4444-555555555555";
const TOKEN = "ExponentPushToken[unit-test]";

function grant(): MockPermissions {
	return { status: "granted", canAskAgain: true };
}

function deny(canAskAgain = true): MockPermissions {
	return { status: "denied", canAskAgain };
}

describe("registerForPush", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockState.isDevice = true;
		mockState.platformOS = "ios";
		mockState.expoConfig = { extra: { eas: { projectId: PROJECT_ID } } };
		mockState.easConfig = null;

		getPermissionsAsync.mockResolvedValue(grant());
		requestPermissionsAsync.mockResolvedValue(grant());
		getExpoPushTokenAsync.mockResolvedValue({ data: TOKEN });

		vi.spyOn(console, "info").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("fails with 'simulator' on simulators without touching the notifications API", async () => {
		mockState.isDevice = false;

		await expect(registerForPush()).resolves.toEqual({
			ok: false,
			reason: "simulator",
		});

		expect(console.info).toHaveBeenCalledWith(
			expect.stringContaining("simulators"),
		);
		expect(setNotificationChannelAsync).not.toHaveBeenCalled();
		expect(getPermissionsAsync).not.toHaveBeenCalled();
		expect(requestPermissionsAsync).not.toHaveBeenCalled();
		expect(getExpoPushTokenAsync).not.toHaveBeenCalled();
	});

	it("fails with 'missing-project-id' without prompting when no EAS projectId is configured", async () => {
		mockState.expoConfig = null;
		mockState.easConfig = null;

		await expect(registerForPush()).resolves.toEqual({
			ok: false,
			reason: "missing-project-id",
		});

		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining("projectId"),
		);
		expect(getPermissionsAsync).not.toHaveBeenCalled();
		expect(requestPermissionsAsync).not.toHaveBeenCalled();
		expect(getExpoPushTokenAsync).not.toHaveBeenCalled();
	});

	it("creates the Android notification channel before checking permissions", async () => {
		mockState.platformOS = "android";

		await expect(registerForPush()).resolves.toEqual({
			ok: true,
			token: TOKEN,
		});

		expect(setNotificationChannelAsync).toHaveBeenCalledWith(
			"default",
			expect.objectContaining({ name: "Default", importance: 3 }),
		);

		const channelOrder =
			setNotificationChannelAsync.mock.invocationCallOrder[0];
		const permissionsOrder = getPermissionsAsync.mock.invocationCallOrder[0];
		expect(channelOrder).toBeLessThan(permissionsOrder ?? 0);
	});

	it("does not create a notification channel on iOS", async () => {
		await expect(registerForPush()).resolves.toEqual({
			ok: true,
			token: TOKEN,
		});

		expect(setNotificationChannelAsync).not.toHaveBeenCalled();
	});

	it("returns the push token without re-prompting when permission is already granted", async () => {
		await expect(registerForPush()).resolves.toEqual({
			ok: true,
			token: TOKEN,
		});

		expect(requestPermissionsAsync).not.toHaveBeenCalled();
		expect(getExpoPushTokenAsync).toHaveBeenCalledWith({
			projectId: PROJECT_ID,
		});
	});

	it("requests permission when undetermined and returns the token once granted", async () => {
		getPermissionsAsync.mockResolvedValue({
			status: "undetermined",
			canAskAgain: true,
		});
		requestPermissionsAsync.mockResolvedValue(grant());

		await expect(registerForPush()).resolves.toEqual({
			ok: true,
			token: TOKEN,
		});

		expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
	});

	it("fails with 'denied' when permission is denied after prompting", async () => {
		getPermissionsAsync.mockResolvedValue({
			status: "undetermined",
			canAskAgain: true,
		});
		requestPermissionsAsync.mockResolvedValue(deny());

		await expect(registerForPush()).resolves.toEqual({
			ok: false,
			reason: "denied",
			canAskAgain: true,
		});

		expect(console.info).toHaveBeenCalledWith(
			expect.stringContaining("permissions were not granted"),
		);
		expect(getExpoPushTokenAsync).not.toHaveBeenCalled();
	});

	it("surfaces canAskAgain=false when the OS will no longer show the prompt", async () => {
		getPermissionsAsync.mockResolvedValue(deny(false));
		requestPermissionsAsync.mockResolvedValue(deny(false));

		await expect(registerForPush()).resolves.toEqual({
			ok: false,
			reason: "denied",
			canAskAgain: false,
		});

		expect(getExpoPushTokenAsync).not.toHaveBeenCalled();
	});

	it("falls back to Constants.easConfig for the projectId", async () => {
		mockState.expoConfig = null;
		mockState.easConfig = { projectId: "eas-config-project" };

		await expect(registerForPush()).resolves.toEqual({
			ok: true,
			token: TOKEN,
		});

		expect(getExpoPushTokenAsync).toHaveBeenCalledWith({
			projectId: "eas-config-project",
		});
	});

	it("fails with 'token-failure' when token retrieval fails with an Error", async () => {
		getExpoPushTokenAsync.mockRejectedValue(new Error("network down"));

		await expect(registerForPush()).resolves.toEqual({
			ok: false,
			reason: "token-failure",
		});

		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining("Failed to register"),
			expect.any(Error),
		);
	});

	it("fails with 'token-failure' when token retrieval fails with a non-Error value", async () => {
		getExpoPushTokenAsync.mockRejectedValue("boom");

		await expect(registerForPush()).resolves.toEqual({
			ok: false,
			reason: "token-failure",
		});

		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining("Failed to register"),
			expect.any(Error),
		);
	});
});
