import { useCallback, useEffect, useRef, useState } from "react";

import type { LibraryPhoto } from "./photos/use-photo-library";

export type ChatRole = "assistant" | "user";

export interface ChatMessage {
	id: string;
	role: ChatRole;
	text: string;
	/** Photos the user sent with the message, in the order they were attached. */
	attachments?: LibraryPhoto[];
}

// Canned replies stand in for a model. Swap `streamReply` for a fetch against
// your own endpoint to make this real — the UI already handles partial text,
// so a token stream drops straight in. Calling a model API directly from the
// app would ship the key in the bundle, so that call belongs behind a proxy.
const REPLIES = [
	"Optimistic UI renders the result before the server confirms it. You append the message locally, fire the request, and reconcile when it lands — so the interface never waits on the network. If the request fails you roll the entry back and surface the error inline.",
	"Compiled to metal —\nthe simulator warms up,\nfirst pixels arrive.",
	"Liquid Glass is the iOS 26 material that refracts and blurs whatever sits behind it, then reacts to motion. It needs a real device or an iOS 26 simulator; older builds fall back to a plain fill.",
	"Here's the short version: keep the list inverted, keep the composer pinned, and never block the input while a response streams. Everything else is detail.",
] as const;

const PHOTO_REPLY =
	"Got the photos. A real model would describe them here — this mock only counts them.";

// Word-at-a-time so the caret keeps moving the way a token stream reads.
const STREAM_INTERVAL_MS = 45;
const THINKING_DELAY_MS = 420;

/**
 * The thread and the mock model behind it: an interruptible, word-at-a-time
 * stream with a beat of "thinking" before the first token.
 */
export function useMockChat() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [isThinking, setIsThinking] = useState(false);

	const idRef = useRef(0);
	const replyRef = useRef(0);
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	const nextId = useCallback(() => {
		idRef.current += 1;
		return String(idRef.current);
	}, []);

	const clearTimers = useCallback(() => {
		for (const timer of timersRef.current) {
			clearTimeout(timer);
		}
		timersRef.current = [];
	}, []);

	// Streaming keeps timers alive past unmount otherwise — leaving them running
	// would setState on a dead component every 45ms.
	useEffect(() => clearTimers, [clearTimers]);

	const stop = useCallback(() => {
		clearTimers();
		setIsStreaming(false);
		setIsThinking(false);
	}, [clearTimers]);

	const streamReply = useCallback((messageId: string, reply: string) => {
		const words = reply.split(" ");
		setIsThinking(false);
		setIsStreaming(true);

		words.forEach((word, index) => {
			const timer = setTimeout(
				() => {
					setMessages((current) =>
						current.map((message) =>
							message.id === messageId
								? {
										...message,
										text: index === 0 ? word : `${message.text} ${word}`,
									}
								: message,
						),
					);

					if (index === words.length - 1) {
						setIsStreaming(false);
					}
				},
				STREAM_INTERVAL_MS * (index + 1),
			);

			timersRef.current.push(timer);
		});
	}, []);

	const isBusy = isStreaming || isThinking;

	/** Appends the user's message and queues a reply. Returns false if it was refused. */
	const send = useCallback(
		(text: string, attachments: LibraryPhoto[] = []) => {
			const trimmed = text.trim();
			if ((!trimmed && attachments.length === 0) || isBusy) {
				return false;
			}

			const assistantId = nextId();
			setMessages((current) => [
				...current,
				{
					id: nextId(),
					role: "user",
					text: trimmed,
					attachments: attachments.length ? attachments : undefined,
				},
				{ id: assistantId, role: "assistant", text: "" },
			]);

			let reply: string;
			if (attachments.length) {
				reply = PHOTO_REPLY;
			} else {
				reply = REPLIES[replyRef.current % REPLIES.length] ?? REPLIES[0];
				replyRef.current += 1;
			}

			// Beat of latency before the first token, so the thinking state is
			// actually visible rather than a one-frame flicker.
			setIsThinking(true);
			timersRef.current.push(
				setTimeout(() => streamReply(assistantId, reply), THINKING_DELAY_MS),
			);
			return true;
		},
		[isBusy, nextId, streamReply],
	);

	const reset = useCallback(() => {
		stop();
		setMessages([]);
	}, [stop]);

	return { messages, isStreaming, isThinking, isBusy, send, stop, reset };
}
