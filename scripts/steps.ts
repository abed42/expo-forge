// Pending-step contract — the machine-readable handoff between the wizard
// and whoever finishes setup: a coding agent, a human, or both. The same
// list backs the `--json` output and the scaffolded NEXT_STEPS.md.

export type PendingStep = {
	/** Stable identifier agents can key on. */
	id: string;
	title: string;
	/** Where the step happens. */
	kind: "browser" | "terminal" | "editor";
	/** false = requires a human (browser auth, interactive login). */
	agentRunnable: boolean;
	/** Terminal command to run, when there is one. */
	command?: string;
	/** Dashboard / docs URL, when there is one. */
	url?: string;
	detail: string;
};

export type KeyStatus = "set" | "skipped" | "removed";

/** Per-vendor key outcome reported in the `--json` result. */
export type KeyReport = {
	clerk: KeyStatus;
	supabaseUrl: KeyStatus;
	supabaseKey: KeyStatus;
	posthog: KeyStatus;
	sentry: KeyStatus;
	revenuecat: KeyStatus;
};

export const buildPendingSteps = (
	keys: KeyReport,
	installed: boolean,
): PendingStep[] => {
	const steps: PendingStep[] = [];

	if (!installed) {
		steps.push({
			id: "bun-install",
			title: "Install dependencies",
			kind: "terminal",
			agentRunnable: true,
			command: "bun install",
			detail:
				"bun install failed during scaffolding — run it from the project root before anything else.",
		});
	}

	if (keys.clerk === "skipped") {
		steps.push(
			{
				id: "clerk-auth-login",
				title: "Authenticate the Clerk CLI",
				kind: "browser",
				agentRunnable: false,
				command: "bunx clerk auth login",
				url: "https://dashboard.clerk.com",
				detail:
					"Opens a browser for authentication — needs a human. Create the Clerk application at dashboard.clerk.com first if one doesn't exist yet.",
			},
			{
				id: "clerk-env-pull",
				title: "Pull the Clerk publishable key",
				kind: "terminal",
				agentRunnable: true,
				command:
					"cd apps/mobile && bunx clerk link --app <app_id> && bunx clerk env pull",
				detail:
					"Writes EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY into apps/mobile/.env.local. WARNING: `clerk env pull` also writes CLERK_SECRET_KEY (it assumes a server app) — delete that line, secrets never live in the client env. Verify: `rg CLERK_SECRET_KEY apps/mobile/.env.local` must return no match.",
			},
		);
	}

	if (keys.supabaseUrl === "skipped" || keys.supabaseKey === "skipped") {
		steps.push(
			{
				id: "supabase-login",
				title: "Authenticate the Supabase CLI",
				kind: "browser",
				agentRunnable: false,
				command: "bunx supabase login",
				url: "https://supabase.com/dashboard",
				detail:
					"Opens a browser for authentication — needs a human. Create the Supabase project at supabase.com/dashboard first if one doesn't exist yet.",
			},
			{
				id: "supabase-link-keys",
				title: "Link the Supabase project and fetch API keys",
				kind: "terminal",
				agentRunnable: true,
				command:
					"cd packages/backend && bunx supabase link --project-ref <ref> && bunx supabase projects api-keys --project-ref <ref>",
				detail:
					"Copy the sb_publishable_... key into EXPO_PUBLIC_SUPABASE_KEY and set EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co in apps/mobile/.env.local. (New projects issue sb_publishable_ keys; the legacy anon JWT is retired.)",
			},
		);
	}

	const optionalSkipped: string[] = [];
	if (keys.posthog === "skipped") {
		optionalSkipped.push("EXPO_PUBLIC_POSTHOG_KEY (PostHog)");
	}
	if (keys.sentry === "skipped") {
		optionalSkipped.push("EXPO_PUBLIC_SENTRY_DSN (Sentry)");
	}
	if (keys.revenuecat === "skipped") {
		optionalSkipped.push("EXPO_PUBLIC_REVENUECAT_API_KEY (RevenueCat)");
	}
	if (optionalSkipped.length > 0) {
		steps.push({
			id: "optional-vendor-keys",
			title: "Add optional vendor keys (or leave blank — they no-op unset)",
			kind: "editor",
			agentRunnable: true,
			detail: `apps/mobile/.env.local has blank entries for: ${optionalSkipped.join(", ")}. Each vendor stays inert until its key is set; the app runs fine without them.`,
		});
	}

	steps.push(
		{
			id: "first-build",
			title: "First dev-client build",
			kind: "terminal",
			agentRunnable: true,
			command: "cd apps/mobile && bun ios",
			detail:
				"Compiles the iOS development client — requires Xcode on macOS and takes several minutes the first time. This template does not run in Expo Go. Use `bun android` (Android Studio) for Android.",
		},
		{
			id: "supabase-db-push",
			title: "Apply Supabase migrations",
			kind: "terminal",
			agentRunnable: true,
			command: "cd packages/backend && supabase db push",
			detail:
				"Applies the template migrations (profiles + RLS, demo feed). Requires the project to be linked first (`bunx supabase link`). All CLI steps use `bunx` so nothing needs global installation; `bun add -g clerk` / `brew install supabase/tap/supabase` are optional.",
		},
		{
			id: "eas-init",
			title: "Link the project to EAS",
			kind: "terminal",
			agentRunnable: false,
			command: "cd apps/mobile && eas init",
			url: "https://expo.dev",
			detail:
				"Interactive Expo login (browser) — needs a human. Expo's monorepo project root is apps/mobile: keep eas.json, credentials.json, and .eas/workflows there. Configure the Expo GitHub App base directory as apps/mobile, then add an EXPO_TOKEN repo secret for CI-driven EAS commands.",
		},
		{
			id: "clerk-third-party-auth",
			title: "Connect Clerk to Supabase (third-party auth)",
			kind: "browser",
			agentRunnable: false,
			url: "https://dashboard.clerk.com",
			detail:
				"Clerk dashboard -> Configure -> Integrations -> Supabase (activate, copy the Clerk domain), then Supabase dashboard -> Authentication -> Third-Party Auth -> add Clerk. Required for the Clerk JWT to authorize RLS (policies key on auth.jwt()->>'sub').",
		},
		{
			id: "clerk-webhook",
			title: "Configure the Clerk user-sync webhook",
			kind: "browser",
			agentRunnable: false,
			url: "https://dashboard.clerk.com",
			detail:
				"Clerk dashboard -> Configure -> Webhooks -> add an endpoint for user.created / user.updated to sync users into the Supabase profiles table (see packages/backend migrations).",
		},
	);

	return steps;
};

const renderStep = (step: PendingStep): string => {
	const lines = [`- [ ] **${step.title}**`];

	if (step.command) {
		lines.push("", "  ```sh", `  ${step.command}`, "  ```", "");
	}

	lines.push(`  ${step.detail}`);

	if (step.url) {
		lines.push(`  <${step.url}>`);
	}

	return lines.join("\n");
};

export const renderNextSteps = (
	appName: string,
	steps: PendingStep[],
): string => {
	const human = steps.filter((step) => !step.agentRunnable);
	const agent = steps.filter((step) => step.agentRunnable);

	const sections = [
		`# Next steps — ${appName}`,
		"",
		"Generated by create-expo-forge from the actual scaffold state. Two groups:",
		"steps that need a human in a browser (interactive auth), and steps a coding",
		"agent — or you — can run in a terminal or editor. Machine-readable version:",
		"re-run the wizard with `--json`.",
		"",
		"**If you are a coding agent** (Claude Code, Codex, Cursor, opencode, …):",
		"execute the Agent / terminal steps yourself — every command works without",
		"global installs (CLIs run via `bunx`) — and relay the browser steps to your",
		"user one at a time, waiting for confirmation before continuing.",
		"",
		"## You (browser)",
		"",
		...(human.length > 0
			? human.map(renderStep)
			: ["Nothing — all remaining steps are agent-runnable."]),
		"",
		"## Agent / terminal",
		"",
		...(agent.length > 0
			? agent.map(renderStep)
			: ["Nothing — all remaining steps need a human."]),
		"",
	];

	return `${sections.join("\n")}\n`.replace(/\n{3,}/g, "\n\n");
};
