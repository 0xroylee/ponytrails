import type {
	AgentAdapter,
	AgentAdapterRuntimeConfig,
	AgentResult,
} from "../agent-adapter.types";
import { runCommand } from "../shell";
import { mapCursorError } from "./errors";
import { extractFinalMessage, extractSessionId } from "./output";

export class CursorAgentAdapter implements AgentAdapter {
	constructor(private config: AgentAdapterRuntimeConfig) {}

	async runPlan(prompt: string): Promise<AgentResult> {
		return this.runNewSession(prompt);
	}

	async runTaskIntake(prompt: string): Promise<AgentResult> {
		return this.runNewSession(prompt);
	}

	async resume(sessionId: string, prompt: string): Promise<AgentResult> {
		return this.runCursor(this.buildResumeArgs(sessionId, prompt));
	}

	async runReview(prompt: string): Promise<AgentResult> {
		return this.runNewSession(prompt);
	}

	async runGithubComment(prompt: string): Promise<AgentResult> {
		return this.runNewSession(prompt);
	}

	private async runNewSession(prompt: string): Promise<AgentResult> {
		return this.runCursor(this.buildNewSessionArgs(prompt));
	}

	private buildNewSessionArgs(prompt: string): string[] {
		return this.appendOptionalArgs(["-p", prompt, "--output-format", "json"]);
	}

	private buildResumeArgs(sessionId: string, prompt: string): string[] {
		return this.appendOptionalArgs([
			"--resume",
			sessionId,
			"-p",
			prompt,
			"--output-format",
			"json",
		]);
	}

	private appendOptionalArgs(args: string[]): string[] {
		const model = this.config.cursor?.model?.trim();
		if (model && model.toLowerCase() !== "auto") {
			args.push("--model", model);
		}
		if (this.config.cursor?.force) {
			args.push("--force");
		}
		return args;
	}

	private async runCursor(args: string[]): Promise<AgentResult> {
		const binary = this.config.cursor?.binary ?? "cursor-agent";
		const result = await runCommand(binary, args, {
			cwd: this.config.executionPath,
			env: this.buildEnv(),
			streamStdout:
				this.config.cursor?.streamLogs ?? this.config.codex.streamLogs,
			streamStderr:
				this.config.cursor?.streamLogs ?? this.config.codex.streamLogs,
			stdinMode: "ignore",
		}).catch((error) => {
			throw mapCursorError(binary, args, {
				code: 127,
				stdout: "",
				stderr: error instanceof Error ? error.message : String(error),
			});
		});

		if (result.code !== 0) {
			throw mapCursorError(binary, args, result);
		}

		return {
			sessionId: extractSessionId(result.stdout),
			finalMessage: extractFinalMessage(result.stdout),
			stdout: result.stdout,
		};
	}

	private buildEnv(): Record<string, string> | undefined {
		const apiKey = this.config.cursor?.apiKey?.trim();
		return apiKey ? { CURSOR_API_KEY: apiKey } : undefined;
	}
}
