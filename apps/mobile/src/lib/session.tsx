import {
	createContext,
	type ReactNode,
	use,
	useCallback,
	useMemo,
	useState,
} from "react";

type Session = {
	onboarded: boolean;
	completeOnboarding: () => void;
};

const SessionContext = createContext<Session | null>(null);

// Tracks onboarding only — auth state comes from @repo/auth (Clerk).
// In-memory for the skeleton: persistence arrives with the storage layer.
export function SessionProvider({ children }: { children: ReactNode }) {
	const [onboarded, setOnboarded] = useState(false);

	const completeOnboarding = useCallback(() => setOnboarded(true), []);

	const value = useMemo(
		() => ({ onboarded, completeOnboarding }),
		[onboarded, completeOnboarding],
	);

	return (
		<SessionContext.Provider value={value}>{children}</SessionContext.Provider>
	);
}

export function useSession(): Session {
	const session = use(SessionContext);
	if (!session) {
		throw new Error("useSession must be used within SessionProvider");
	}
	return session;
}
