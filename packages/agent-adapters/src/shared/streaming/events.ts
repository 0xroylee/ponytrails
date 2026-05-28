import type { AgentStreamEvent } from "devos-agents";
import type { AgentAdapterRunRequest } from "../../types/agent-adapter.types";

export function emitStreamEvent(
	request: AgentAdapterRunRequest,
	stream: AgentStreamEvent["stream"],
	text: string,
): void {
	request.onStream?.({
		stream,
		text,
		traceId: request.traceId,
		recordedAt: new Date().toISOString(),
	});
}
