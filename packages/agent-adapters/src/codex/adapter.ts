import { mkdir } from "node:fs/promises";
import path from "node:path";
import { AgentAdapterError } from "../adapter-error";
import { runCommand } from "../shared/execute/shell";
import { renderAgentPrompt } from "../shared/skills/request-prompt";
import { emitStreamEvent } from "../shared/streaming/events";
import type {
	AgentAdapter,
	AgentAdapterRunRequest,
	AgentAdapterRuntimeConfig,
	AgentResult,
	CodexReasoningEffort,
} from "../types/agent-adapter.types";
import {
	validateAgentAdapterRunRequest,
	validateAgentAdapterRuntimeConfig,
} from "../validation";
import { buildCodexExecArgs, buildCodexResumeArgs } from "./cli/execute/args";
import { buildCodexRuntimeInvocation } from "./cli/execute/runtime";
import { extractSessionId, extractUsage } from "./cli/parse/output";
import { readOutputFile } from "./cli/sessions/output-file";
import { resolveCodexStageConfig } from "./cli/sessions/stage-config";
import { buildCodexConfigOverrides } from "./cli/skills/config-overrides";

export { extractSessionId, extractUsage } from "./cli/parse/output";

export class CodexAdapter implements AgentAdapter {
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
		const stage = resolveCodexStageConfig(this.config, validatedRequest.role);
		const outputFile = await this.nextOutputFile();
		const prompt = renderAgentPrompt(validatedRequest);
		const args = validatedRequest.sessionId
			? buildCodexResumeArgs({
					config: this.config,
					request: validatedRequest,
					prompt,
					outputFile,
					modelOverride: stage.model,
					reasoningEffortOverride: stage.reasoningEffort,
					fastModeEnabled: stage.fastModeEnabled,
				})
			: buildCodexExecArgs({
					config: this.config,
					request: validatedRequest,
					prompt,
					outputFile,
					modelOverride: stage.model,
					reasoningEffortOverride: stage.reasoningEffort,
					fastModeEnabled: stage.fastModeEnabled,
				});
		return this.runCodex(args, validatedRequest);
	}

	private async runCodex(
		args: string[],
		request: AgentAdapterRunRequest,
	): Promise<AgentResult> {
		const invocation = buildCodexRuntimeInvocation(this.config, args);
		const result = await runCommand(invocation.command, invocation.args, {
			cwd: invocation.cwd,
			env: invocation.env,
			streamStdout: this.config.codex.streamLogs,
			streamStderr: this.config.codex.streamLogs,
			stdinMode: "ignore",
			onStdout: (text) => emitStreamEvent(request, "stdout", text),
			onStderr: (text) => emitStreamEvent(request, "stderr", text),
		}).catch((error) => {
			throw this.toError(
				invocation.command,
				invocation.args,
				invocation.cwd,
				request,
				{
					code: 127,
					stdout: "",
					stderr: error instanceof Error ? error.message : String(error),
				},
			);
		});

		if (result.code !== 0) {
			throw this.toError(
				invocation.command,
				invocation.args,
				invocation.cwd,
				request,
				result,
			);
		}
		const sessionId = extractSessionId(result.stdout);
		const finalMessage = await readOutputFile(invocation.hostOutputFile);
		const usage = extractUsage(result.stdout);
		return {
			sessionId,
			finalMessage,
			stdout: result.stdout,
			stderr: result.stderr,
			traceId: request.traceId,
			backend: "codex",
			usage,
		};
	}

	private async nextOutputFile(): Promise<string> {
		const dir = path.resolve(this.config.workspacePath, ".devos", "tmp");
		await mkdir(dir, { recursive: true });
		return path.join(
			dir,
			`codex-output-${Date.now()}-${Math.floor(Math.random() * 10000)}.txt`,
		);
	}

	private buildConfigOverrides(
		reasoningEffortOverride?: CodexReasoningEffort,
		fastModeEnabled?: boolean,
		request: AgentAdapterRunRequest = { role: "planning", prompt: "" },
	): string[] {
		return buildCodexConfigOverrides(
			this.config,
			request,
			reasoningEffortOverride,
			fastModeEnabled,
		);
	}

	private toError(
		command: string,
		args: string[],
		cwd: string,
		request: AgentAdapterRunRequest,
		result: { code: number; stdout: string; stderr: string },
	): AgentAdapterError {
		return new AgentAdapterError({
			backend: "codex",
			message: `${command} failed with exit code ${result.code}`,
			command,
			args,
			cwd,
			code: result.code,
			stdout: result.stdout,
			stderr: result.stderr,
			traceId: request.traceId,
		});
	}
}
