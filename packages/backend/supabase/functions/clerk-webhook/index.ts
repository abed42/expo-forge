// Clerk webhook → Supabase user sync (Deno edge function).
//
// Verifies the Svix signature by hand with Web Crypto (no npm svix dep) and
// mirrors Clerk users into public.profiles with the service-role client
// (bypasses RLS — clients never insert their own rows).
//
// NOTE: this file targets the Deno runtime and is excluded from the package
// tsconfig — do not import it from React Native code.

import { createClient } from "npm:@supabase/supabase-js@2";

type ClerkEmailAddress = {
	id: string;
	email_address: string;
};

type ClerkUserData = {
	id: string;
	email_addresses?: ClerkEmailAddress[];
	primary_email_address_id?: string | null;
	first_name?: string | null;
	last_name?: string | null;
	image_url?: string | null;
};

type ClerkWebhookEvent = {
	type: string;
	data: ClerkUserData;
};

const encoder = new TextEncoder();

/** Seconds of clock skew tolerated on svix-timestamp (replay protection). */
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

/**
 * Svix signature scheme (https://docs.svix.com/receiving/verifying-payloads):
 * signed content is `${svix-id}.${svix-timestamp}.${raw body}`, MAC is
 * HMAC-SHA256 keyed with the base64-decoded portion of the `whsec_` secret,
 * and the svix-signature header holds space-separated `v1,<base64 mac>`
 * entries (several during secret rotation) — any match passes.
 */
async function verifySvixSignature(
	secret: string,
	svixId: string,
	svixTimestamp: string,
	svixSignature: string,
	body: string,
): Promise<boolean> {
	const timestamp = Number(svixTimestamp);
	const nowSeconds = Date.now() / 1000;
	if (
		!Number.isFinite(timestamp) ||
		Math.abs(nowSeconds - timestamp) > TIMESTAMP_TOLERANCE_SECONDS
	) {
		return false;
	}

	const key = await crypto.subtle.importKey(
		"raw",
		base64ToBytes(secret.replace(/^whsec_/, "")),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const mac = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(`${svixId}.${svixTimestamp}.${body}`),
	);
	const expected = bytesToBase64(new Uint8Array(mac));

	return svixSignature.split(" ").some((entry) => {
		const [version, signature] = entry.split(",");
		return (
			version === "v1" &&
			typeof signature === "string" &&
			timingSafeEqual(signature, expected)
		);
	});
}

function primaryEmail(data: ClerkUserData): string | null {
	const addresses = data.email_addresses ?? [];
	const primary = addresses.find(
		(address) => address.id === data.primary_email_address_id,
	);
	return (primary ?? addresses[0])?.email_address ?? null;
}

function fullName(data: ClerkUserData): string | null {
	const name = [data.first_name, data.last_name]
		.filter((part): part is string => Boolean(part))
		.join(" ");
	return name.length > 0 ? name : null;
}

Deno.serve(async (request: Request): Promise<Response> => {
	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	const signingSecret = Deno.env.get("CLERK_WEBHOOK_SIGNING_SECRET");
	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!(signingSecret && supabaseUrl && serviceRoleKey)) {
		console.error(
			"[clerk-webhook] Missing CLERK_WEBHOOK_SIGNING_SECRET, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY.",
		);
		return new Response("Server misconfigured", { status: 500 });
	}

	const svixId = request.headers.get("svix-id");
	const svixTimestamp = request.headers.get("svix-timestamp");
	const svixSignature = request.headers.get("svix-signature");
	if (!(svixId && svixTimestamp && svixSignature)) {
		return new Response("Missing Svix headers", { status: 400 });
	}

	const body = await request.text();

	const verified = await verifySvixSignature(
		signingSecret,
		svixId,
		svixTimestamp,
		svixSignature,
		body,
	);
	if (!verified) {
		return new Response("Invalid signature", { status: 401 });
	}

	let event: ClerkWebhookEvent;
	try {
		event = JSON.parse(body) as ClerkWebhookEvent;
	} catch {
		return new Response("Invalid JSON payload", { status: 400 });
	}
	if (!event.data?.id) {
		return new Response("Malformed event: missing data.id", { status: 400 });
	}

	const supabase = createClient(supabaseUrl, serviceRoleKey);

	switch (event.type) {
		case "user.created":
		case "user.updated": {
			const { error } = await supabase.from("profiles").upsert({
				id: event.data.id,
				email: primaryEmail(event.data),
				full_name: fullName(event.data),
				avatar_url: event.data.image_url ?? null,
			});
			if (error) {
				console.error("[clerk-webhook] Upsert failed:", error.message);
				return new Response("Upsert failed", { status: 500 });
			}
			return new Response("Profile synced", { status: 200 });
		}
		case "user.deleted": {
			const { error } = await supabase
				.from("profiles")
				.delete()
				.eq("id", event.data.id);
			if (error) {
				console.error("[clerk-webhook] Delete failed:", error.message);
				return new Response("Delete failed", { status: 500 });
			}
			return new Response("Profile deleted", { status: 200 });
		}
		default:
			// Acknowledge unhandled event types so Clerk does not retry them.
			return new Response(`Ignored event type: ${event.type}`, {
				status: 200,
			});
	}
});
