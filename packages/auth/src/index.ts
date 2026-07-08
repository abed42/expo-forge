// Sign-in flow hooks are re-exported so app code never imports @clerk/expo
// directly — the vendor stays swappable behind @repo/auth.
export { useSignIn, useSignUp, useSSO } from "@clerk/expo";
export { authKeys } from "./keys";
export {
	AuthProvider,
	type AuthProviderProps,
	useAuth,
	useUser,
} from "./provider";
