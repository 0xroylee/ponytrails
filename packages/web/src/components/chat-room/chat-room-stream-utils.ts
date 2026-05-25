import type { RealtimeChatStreamBuffer } from "@/lib/realtime/types/realtime-store.types";
import type { ChatStreamLine } from "./types/chat-room.types";

export function chatStreamLinesForSession(
	streamsByRunId: Record<string, RealtimeChatStreamBuffer>,
	sessionId: string,
): ChatStreamLine[] {
	return Object.values(streamsByRunId)
		.filter((stream) => stream.sessionId === sessionId)
		.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
		.map(
			(stream): ChatStreamLine => ({
				id: stream.runId,
				stream: stream.status === "error" ? "stderr" : "system",
				text:
					stream.status === "error"
						? (stream.error ?? "Chat stream failed")
						: stream.content,
			}),
		)
		.filter((line) => line.text.trim().length > 0);
}
