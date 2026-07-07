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
	signedIn: boolean;
	completeOnboarding: () => void;
	signIn: () => void;
	signOut: () => void;
};

const SessionContext = createContext<Session | null>(null);

// In-memory for the skeleton: onboarded persistence arrives with the storage
// layer, and signIn/signOut are replaced by @repo/auth (Clerk) once wired —
// the guards in app/_layout.tsx then read Clerk's isSignedIn instead.
export function SessionProvider({ children }: { children: ReactNode }) {
	const [onboarded, setOnboarded] = useState(false);
	const [signedIn, setSignedIn] = useState(false);

	const completeOnboarding = useCallback(() => setOnboarded(true), []);
	const signIn = useCallback(() => setSignedIn(true), []);
	const signOut = useCallback(() => setSignedIn(false), []);

	const value = useMemo(
		() => ({ onboarded, signedIn, completeOnboarding, signIn, signOut }),
		[onboarded, signedIn, completeOnboarding, signIn, signOut],
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
