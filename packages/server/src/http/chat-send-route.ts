import type { RealtimeEventPublisher } from "../realtime";
import { isNoCliWorkerAvailableError } from "../tasks/task-requirement-errors";
import { createChatSendRealtimeCallbacks } from "./chat-route-realtime";
import { notFound } from "./http-utils";
import { jsonError } from "./response";
import type {
	ChatSendRouteMessageInput,
	ChatSendRouteService,
} from "./types/chat-send-route.types";

type QueueMessageResult = Awaited<
	ReturnType<ChatSendRouteService["queueMessage"]>
>;

export async function handleChatSend(
	service: ChatSendRouteService,
	sessionId: string,
	input: ChatSendRouteMessageInput,
	realtimeEvents?: RealtimeEventPublisher,
): Promise<
	| { status: "ok"; result: QueueMessageResult }
	| { status: "error"; response: Response }
> {
	let result: QueueMessageResult;
	try {
		result = await service.queueMessage(
			sessionId,
			input,
			createChatSendRealtimeCallbacks(realtimeEvents),
		);
	} catch (error) {
		if (isNoCliWorkerAvailableError(error)) {
			return {
				status: "error",
				response: jsonError(error.message, { status: error.statusCode }),
			};
		}
		throw error;
	}
	if (!result) {
		return { status: "error", response: notFound("Chat session not found") };
	}
	const immediateCompletion = await readImmediateCompletion(result.completion);
	if (immediateCompletion.status === "rejected") {
		if (isNoCliWorkerAvailableError(immediateCompletion.error)) {
			return {
				status: "error",
				response: jsonError(immediateCompletion.error.message, {
					status: immediateCompletion.error.statusCode,
				}),
			};
		}
		throw immediateCompletion.error;
	}
	return { status: "ok", result };
}

async function readImmediateCompletion(
	completion: Promise<unknown>,
): Promise<
	| { status: "pending" }
	| { status: "fulfilled" }
	| { status: "rejected"; error: unknown }
> {
	return Promise.race([
		completion.then(
			() => ({ status: "fulfilled" as const }),
			(error: unknown) => ({ status: "rejected" as const, error }),
		),
		new Promise<{ status: "pending" }>((resolve) =>
			setTimeout(() => resolve({ status: "pending" }), 0),
		),
	]);
}
