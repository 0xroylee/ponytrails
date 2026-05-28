import type { AgentResult } from "../../../types/agent-adapter.types";

export function extractFinalMessage(jsonOutput: string): string {
	try {
		const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;
		if (typeof parsed.result === "string") return parsed.result;
		if (typeof parsed.content === "string") return parsed.content;
		if (typeof parsed.message === "string") return parsed.message;
		if (Array.isArray(parsed.messages)) {
			const last = parsed.messages[parsed.messages.length - 1];
			if (
				last &&
				typeof last === "object" &&
				typeof last.content === "string"
			) {
				return last.content;
			}
		}
	} catch {}
	return jsonOutput;
}

export function extractSessionId(jsonOutput: string): string | undefined {
	try {
		const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;
		const id =
			parsed.session_id ??
			parsed.sessionId ??
			parsed.conversation_id ??
			parsed.conversationId;
		if (typeof id === "string") {
			return id;
		}
	} catch {}
	return undefined;
}

export function extractUsage(
	jsonOutput: string,
): AgentResult["usage"] | undefined {
	try {
		const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;
		const usage = parsed.usage as Record<string, unknown> | undefined;
		if (!usage) {
			return undefined;
		}
		return {
			inputTokens:
				typeof usage.input_tokens === "number" ? usage.input_tokens : undefined,
			outputTokens:
				typeof usage.output_tokens === "number"
					? usage.output_tokens
					: undefined,
			totalTokens:
				typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
		};
	} catch {}
	return undefined;
}
