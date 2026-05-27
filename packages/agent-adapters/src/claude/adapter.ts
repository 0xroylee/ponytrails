import { renderAgentPrompt } from "../request-prompt";
import { runCommand } from "../shell";
import { emitStreamEvent } from "../streaming";
import type {
	AgentAdapter,
	AgentAdapterRunRequest,
	AgentAdapterRuntimeConfig,
	AgentResult,
} from "../types/agent-adapter.types";
import { mapClaudeError } from "./errors";
import { extractFinalMessage, extractSessionId, extractUsage } from "./output";
import { getClaudeBinaryPath } from "./path";

export class ClaudeCodeAdapter implements AgentAdapter {
	private claudePath: string;

	constructor(private config: AgentAdapterRuntimeConfig) {
		this.claudePath = getClaudeBinaryPath(config.codex?.binary);
	}

	async runPlan(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt);
	}

	async runTaskIntake(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt);
	}

	async resume(sessionId: string, prompt: string): Promise<AgentResult> {
		return this.runClaudeResume(sessionId, prompt);
	}

	async runReview(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt);
	}

	async runGithubComment(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt);
	}

	async runAgent(request: AgentAdapterRunRequest): Promise<AgentResult> {
		const prompt = renderAgentPrompt(request);
		const args = request.sessionId
			? this.buildResumeArgs(request.sessionId, prompt)
			: this.buildNewSessionArgs(prompt);
		return this.executeClaude(args, request);
	}

	private runClaude(prompt: string): Promise<AgentResult> {
		return this.executeClaude(this.buildNewSessionArgs(prompt), {
			role: "planning",
			prompt,
		});
	}

	private runClaudeResume(
		sessionId: string,
		prompt: string,
	): Promise<AgentResult> {
		return this.executeClaude(this.buildResumeArgs(sessionId, prompt), {
			role: "implementing",
			prompt,
			sessionId,
		});
	}

	private buildNewSessionArgs(prompt: string): string[] {
		return ["-p", prompt, ...this.buildCommonArgs()];
	}

	private buildResumeArgs(sessionId: string, prompt: string): string[] {
		return ["--resume", sessionId, "-p", prompt, ...this.buildCommonArgs()];
	}

	private buildModelArgs(): string[] {
		const model = this.config.claude?.model ?? this.config.agent?.model;
		if (!model) return [];
		return ["--model", model];
	}

	private buildMaxTurnsArgs(): string[] {
		const maxTurns =
			this.config.claude?.maxTurns ?? this.config.agent?.maxTurns;
		if (!maxTurns || maxTurns <= 0) return [];
		return ["--max-turns", String(maxTurns)];
	}

	private buildAllowedToolsArgs(): string[] {
		const tools =
			this.config.claude?.allowedTools ?? this.config.agent?.allowedTools;
		if (!tools || tools.length === 0) return [];
		return ["--allowedTools", ...tools];
	}

	private buildCommonArgs(): string[] {
		const permissionMode =
			this.config.claude?.permissionMode ??
			this.config.agent?.permissionMode ??
			"bypassPermissions";
		return [
			"--output-format",
			"json",
			"--permission-mode",
			permissionMode,
			...this.buildModelArgs(),
			...this.buildMaxTurnsArgs(),
			...this.buildAllowedToolsArgs(),
		];
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
