// chat: the Chat tab is an entry point, not a screen. Its trigger in
// `(tabs)/_layout.tsx` is `disabled` (native selection suppressed) and pushes
// the full-screen `/chat` route instead, so this file is never shown — it only
// exists because every NativeTabs trigger needs a route.
export default function ChatTab() {
	return null;
}
