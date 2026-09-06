import { KeyboardProvider } from "react-native-keyboard-controller";

import { ChatScreen } from "@/components/chat/chat-screen";

// chat: the whole feature lives in `src/components/chat` — see its README for
// how to remove it. A full-screen stack route pushed over the tabs (the Chat
// tab's trigger opens it), so the composer docks on the home indicator where
// the tab bar would be. The keyboard provider is scoped here rather than at
// the root so the rest of the app carries nothing from it.
export default function ChatRoute() {
	return (
		<KeyboardProvider>
			<ChatScreen />
		</KeyboardProvider>
	);
}
