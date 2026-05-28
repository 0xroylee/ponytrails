import { runCommand } from "../shared/execute/shell";
import { renderAgentPrompt } from "../shared/skills/request-prompt";
import { emitStreamEvent } from "../shared/streaming/events";
import type {
	AgentAdapter,
	AgentAdapterRunRequest,
	AgentAdapterRuntimeConfig,
	AgentResult,
} from "../types/agent-adapter.types";
import {
	validateAgentAdapterRunRequest,
	validateAgentAdapterRuntimeConfig,
} from "../validation";
import {
	buildCursorEnv,
	buildCursorNewSessionArgs,
	buildCursorResumeArgs,
} from "./cli/execute/args";
import { mapCursorError } from "./cli/parse/errors";
import {
	extractFinalMessage,
	extractSessionId,
	extractUsage,
} from "./cli/parse/output";

export class CursorAgentAdapter implements AgentAdapter {
	constructor(config: AgentAdapterRuntimeConfig) {
		this.config = validateAgentAdapterRuntimeConfig(config);
	}

	private config: AgentAdapterRuntimeConfig;

	async runPlan(prompt: string): Promise<AgentResult> {
		return this.runAgent({ role: "planning", prompt });
	}

	async runTaskIntake(prompt: string): Promise<AgentResult> {
		return this.runAgent({ role: "task-intake", prompt });
	}

	async resume(sessionId: string, prompt: string): Promise<AgentResult> {
		return this.runAgent({ role: "implementing", prompt, sessionId });
	}

	async runReview(prompt: string): Promise<AgentResult> {
		return this.runAgent({ role: "review-testing", prompt });
	}

	async runGithubComment(prompt: string): Promise<AgentResult> {
		return this.runAgent({ role: "github-comment", prompt });
	}

	async runAgent(request: AgentAdapterRunRequest): Promise<AgentResult> {
		const validatedRequest = validateAgentAdapterRunRequest(request);
		const prompt = renderAgentPrompt(validatedRequest);
		const args = validatedRequest.sessionId
			? buildCursorResumeArgs(this.config, validatedRequest.sessionId, prompt)
			: buildCursorNewSessionArgs(this.config, prompt);
		return this.runCursor(args, validatedRequest);
	}

	private async runCursor(
		args: string[],
		request: AgentAdapterRunRequest,
	): Promise<AgentResult> {
		const binary = this.config.cursor?.binary ?? "cursor-agent";
		const cwd = this.config.executionPath;
		const result = await runCommand(binary, args, {
			cwd,
			env: buildCursorEnv(this.config),
			streamStdout:
				this.config.cursor?.streamLogs ?? this.config.codex.streamLogs,
			streamStderr:
				this.config.cursor?.streamLogs ?? this.config.codex.streamLogs,
			stdinMode: "ignore",
			onStdout: (text) => emitStreamEvent(request, "stdout", text),
			onStderr: (text) => emitStreamEvent(request, "stderr", text),
		}).catch((error) => {
			throw mapCursorError(
				binary,
				args,
				{
					code: 127,
					stdout: "",
					stderr: error instanceof Error ? error.message : String(error),
				},
				{
					cwd,
					request,
				},
			);
		});

		if (result.code !== 0) {
			throw mapCursorError(binary, args, result, { cwd, request });
		}

		return {
			sessionId: extractSessionId(result.stdout) ?? request.sessionId,
			finalMessage: extractFinalMessage(result.stdout),
			stdout: result.stdout,
			stderr: result.stderr,
			traceId: request.traceId,
			backend: "cursor-agent",
			usage: extractUsage(result.stdout),
		};
	}
}
