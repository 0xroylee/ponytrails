import type { AgentAdapter, AgentResult } from "../core/agent-adapter";
import type { ResolvedProjectConfig } from "../core/types";
import { getClaudeBinaryPath } from "../utils/claude-path";
import { assertCommandOk, runCommand } from "../utils/shell";

export class ClaudeCodeAdapter implements AgentAdapter {
	private claudePath: string;

	constructor(private config: ResolvedProjectConfig) {
		this.claudePath = getClaudeBinaryPath(config.codex?.binary);
	}

	async runPlan(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt);
	}

	async resume(_sessionId: string, prompt: string): Promise<AgentResult> {
		return this.runClaudeContinue(prompt);
	}

	async runReview(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt);
	}

	private async runClaude(prompt: string): Promise<AgentResult> {
		const args = ["-p", prompt, "--output-format", "json"];

		const result = await runCommand(this.claudePath, args, {
			cwd: this.config.executionPath,
			streamStdout: this.config.codex.streamLogs,
			streamStderr: this.config.codex.streamLogs,
			stdinMode: "ignore",
		});

		assertCommandOk(this.claudePath, args, result);
		const finalMessage = extractFinalMessage(result.stdout);
		const sessionId = extractSessionId(result.stdout);
		const usage = extractUsage(result.stdout);

		return {
			sessionId,
			finalMessage,
			stdout: result.stdout,
			usage,
		};
	}

	private async runClaudeContinue(prompt: string): Promise<AgentResult> {
		const args = ["--continue", prompt, "--output-format", "json"];

		const result = await runCommand(this.claudePath, args, {
			cwd: this.config.executionPath,
			streamStdout: this.config.codex.streamLogs,
			streamStderr: this.config.codex.streamLogs,
			stdinMode: "ignore",
		});

		assertCommandOk(this.claudePath, args, result);
		const finalMessage = extractFinalMessage(result.stdout);
		const sessionId = extractSessionId(result.stdout);
		const usage = extractUsage(result.stdout);

		return {
			sessionId,
			finalMessage,
			stdout: result.stdout,
			usage,
		};
	}
}

function extractFinalMessage(jsonOutput: string): string {
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
