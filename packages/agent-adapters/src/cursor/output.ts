import type { AgentResult } from "../types/agent-adapter.types";

export function extractFinalMessage(jsonOutput: string): string {
	try {
		const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;
		return typeof parsed.result === "string" ? parsed.result : jsonOutput;
	} catch {}
	return jsonOutput;
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
		const inputTokens = readNumber(usage, ["input_tokens", "inputTokens"]);
		const outputTokens = readNumber(usage, ["output_tokens", "outputTokens"]);
		const totalTokens = readNumber(usage, ["total_tokens", "totalTokens"]);
		return {
			inputTokens,
			outputTokens,
			totalTokens:
				totalTokens ??
				(inputTokens !== undefined || outputTokens !== undefined
					? (inputTokens ?? 0) + (outputTokens ?? 0)
					: undefined),
		};
	} catch {}
	return undefined;
}

function readNumber(
	record: Record<string, unknown>,
	keys: string[],
): number | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "number" && Number.isFinite(value)) {
			return value;
		}
	}
	return undefined;
}

export function extractSessionId(jsonOutput: string): string | undefined {
	try {
		const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;
		const id = parsed.session_id ?? parsed.sessionId;
		return typeof id === "string" ? id : undefined;
	} catch {}
	return undefined;
}
