import { runCommand } from "../shared/execute/shell";
import { renderAgentPrompt } from "../shared/skills/request-prompt";
import { emitStreamEvent } from "../shared/streaming/events";
import type {
	AgentAdapter,
	AgentAdapterRunRequest,
	AgentAdapterRunRole,
	AgentAdapterRuntimeConfig,
	AgentResult,
} from "../types/agent-adapter.types";
import {
	validateAgentAdapterRunRequest,
	validateAgentAdapterRuntimeConfig,
} from "../validation";
import {
	buildClaudeCommonArgs,
	buildClaudeNewSessionArgs,
	buildClaudeResumeArgs,
} from "./cli/execute/args";
import { mapClaudeError } from "./cli/parse/errors";
import {
	extractFinalMessage,
	extractSessionId,
	extractUsage,
} from "./cli/parse/output";
import { getClaudeBinaryPath } from "./cli/utils/path";

export class ClaudeCodeAdapter implements AgentAdapter {
	private claudePath: string;
	private config: AgentAdapterRuntimeConfig;

	constructor(config: AgentAdapterRuntimeConfig) {
		this.config = validateAgentAdapterRuntimeConfig(config);
		this.claudePath = getClaudeBinaryPath(this.config.codex.binary);
	}

	async runPlan(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt, "planning");
	}

	async runTaskIntake(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt, "task-intake");
	}

	async resume(sessionId: string, prompt: string): Promise<AgentResult> {
		return this.runClaudeResume(sessionId, prompt);
	}

	async runReview(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt, "review-testing");
	}

	async runGithubComment(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt, "github-comment");
	}

	async runAgent(request: AgentAdapterRunRequest): Promise<AgentResult> {
		const validatedRequest = validateAgentAdapterRunRequest(request);
		const prompt = renderAgentPrompt(validatedRequest);
		const args = validatedRequest.sessionId
			? buildClaudeResumeArgs(this.config, validatedRequest.sessionId, prompt)
			: buildClaudeNewSessionArgs(this.config, prompt);
		return this.executeClaude(args, validatedRequest);
	}

	private runClaude(
		prompt: string,
		role: AgentAdapterRunRole = "planning",
	): Promise<AgentResult> {
		const request = validateAgentAdapterRunRequest({ role, prompt });
		const renderedPrompt = renderAgentPrompt(request);
		return this.executeClaude(
			buildClaudeNewSessionArgs(this.config, renderedPrompt),
			request,
		);
	}

	private runClaudeResume(
		sessionId: string,
		prompt: string,
	): Promise<AgentResult> {
		const request = validateAgentAdapterRunRequest({
			role: "implementing",
			prompt,
			sessionId,
		});
		const renderedPrompt = renderAgentPrompt(request);
		return this.executeClaude(
			buildClaudeResumeArgs(this.config, sessionId, renderedPrompt),
			request,
		);
	}

	private buildCommonArgs(): string[] {
		return buildClaudeCommonArgs(this.config);
	}

	private async executeClaude(
		args: string[],
		request: AgentAdapterRunRequest,
	): Promise<AgentResult> {
		const cwd = this.config.executionPath;
		const result = await runCommand(this.claudePath, args, {
			cwd,
			streamStdout: this.config.codex.streamLogs,
			streamStderr: this.config.codex.streamLogs,
			stdinMode: "ignore",
			onStdout: (text) => emitStreamEvent(request, "stdout", text),
			onStderr: (text) => emitStreamEvent(request, "stderr", text),
		}).catch((error) => {
			throw mapClaudeError(this.claudePath, args, cwd, request, {
				code: 127,
				stdout: "",
				stderr: error instanceof Error ? error.message : String(error),
			});
		});

		if (result.code !== 0) {
			throw mapClaudeError(this.claudePath, args, cwd, request, result);
		}

		return {
			sessionId: extractSessionId(result.stdout) ?? request.sessionId,
			finalMessage: extractFinalMessage(result.stdout),
			stdout: result.stdout,
			stderr: result.stderr,
			traceId: request.traceId,
			backend: "claude-code",
			usage: extractUsage(result.stdout),
		};
	}
}
