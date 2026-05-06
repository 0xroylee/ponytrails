import { runPlanSession, runResumeSession, runReviewSession } from "./codex";
import {
	buildBugsCanceledComment,
	buildImplementationComment,
	buildPlanComment,
	buildReviewComment,
} from "./comments";
import { type LoadedConfig, getProjectById } from "./config";
import {
	commentOnPr,
	createBugIssues,
	createDraftPrFromWorktree,
} from "./github";
import { LinearClient } from "./linear";
import { logger, normalizeError } from "./logger";
import {
	buildImplementPrompt,
	buildPlanPrompt,
	buildReviewPrompt,
} from "./prompts";
import { parseReviewOutcome } from "./review";
import {
	loadRunState,
	normalizeIssueKey,
	saveRunState,
	transitionStage,
} from "./state";
import type {
	CodexUsageRecord,
	PollingConfig,
	ResolvedProjectConfig,
	RunOptions,
	RunState,
} from "./types";

export async function runWorkflow(
	config: LoadedConfig,
	options: RunOptions,
): Promise<void> {
	const projects = pickProjects(config, options);
	if (projects.length === 0) {
		logger.info("No project selected.");
		return;
	}

	let projectContexts = projects.map((project) => ({
		config: project,
		linear: new LinearClient(project),
	}));

	if (options.issueArg && options.allProjects && !options.projectId) {
		projectContexts = await routeProjectContextsForTargetIssue(
			projectContexts,
			options.issueArg,
		);
		if (projectContexts.length === 0) {
			return;
		}
	}
	const globalPolling = resolvePollingSettings(config.polling, options);
	let cycle = 0;

	while (true) {
		cycle += 1;
		let totalIssues = 0;

		for (const context of projectContexts) {
			totalIssues += await runProjectCycle(
				context.config,
				options,
				context.linear,
				cycle,
				globalPolling,
			);
		}

		if (shouldStopPolling(globalPolling, options, cycle, totalIssues)) {
			return;
		}

		await sleep(globalPolling.intervalMs);
	}
}

function pickProjects(
	config: LoadedConfig,
	options: RunOptions,
): ResolvedProjectConfig[] {
	if (options.projectId) {
		const project = getProjectById(config, options.projectId);
		if (!project) {
			throw new Error(`Project '${options.projectId}' not found`);
		}
		return [project];
	}
	if (options.allProjects) {
		return config.projects;
	}
	return config.projects.slice(0, 1);
}

async function routeProjectContextsForTargetIssue(
	contexts: Array<{ config: ResolvedProjectConfig; linear: LinearClient }>,
	issueArg: string,
): Promise<Array<{ config: ResolvedProjectConfig; linear: LinearClient }>> {
	const routeLogger = logger.child({ issueArg });
	const issue = await contexts[0]?.linear.fetchIssueByIdentifier(issueArg);
	if (!issue) {
		routeLogger.info("Target issue was not found; skipping run.");
		return [];
	}

	const routing = routeProjectsForIssueProjectId(
		contexts.map((context) => context.config),
		issue.projectId,
	);
	if (routing.error) {
		throw new Error(routing.error);
	}
	if (!routing.selectedProjectId) {
		routeLogger.info(
			{
				issueKey: issue.identifier,
				issueProjectId: issue.projectId ?? null,
				reason: routing.skipReason,
			},
			"Target issue is not routable to any configured project; skipping run",
		);
		return [];
	}

	const selected = contexts.filter(
		(context) => context.config.id === routing.selectedProjectId,
	);
	routeLogger.info(
		{
			issueKey: issue.identifier,
			issueProjectId: issue.projectId ?? null,
			projectId: routing.selectedProjectId,
		},
		"Routed target issue to project by Linear project id",
	);
	return selected;
}

export interface IssueProjectRoutingResult {
	selectedProjectId?: string;
	skipReason?: string;
	error?: string;
}

export function routeProjectsForIssueProjectId(
	projects: ResolvedProjectConfig[],
	issueProjectId: string | undefined,
): IssueProjectRoutingResult {
	const scopedProjects = projects.filter((project) => project.linear.projectId);
	const unscopedProjects = projects.filter(
		(project) => !project.linear.projectId,
	);

	if (!issueProjectId) {
		if (unscopedProjects.length > 1) {
			return {
				error:
					"Target issue has no Linear project id and multiple unscoped projects are configured. Re-run with --project <PROJECT_ID>.",
			};
		}
		return {
			skipReason:
				"Target issue has no Linear project id and cannot be safely routed in --all-projects mode.",
		};
	}

	const explicitMatches = scopedProjects.filter(
		(project) => project.linear.projectId === issueProjectId,
	);
	if (explicitMatches.length > 1) {
		return {
			error: `Multiple projects are configured with linear.projectId='${issueProjectId}'. Re-run with --project <PROJECT_ID>.`,
		};
	}
	if (explicitMatches.length === 1) {
		return {
			selectedProjectId: explicitMatches[0]?.id,
		};
	}
	if (unscopedProjects.length > 1) {
		return {
			error:
				"No explicit linear.projectId match was found and multiple unscoped projects are configured. Re-run with --project <PROJECT_ID>.",
		};
	}
	return {
		skipReason: `No project configured for linear.projectId='${issueProjectId}'.`,
	};
}

export function shouldStopPolling(
	polling: PollingSettings,
	options: RunOptions,
	cycle: number,
	totalIssues: number,
): boolean {
	if (!polling.enabled || options.issueArg) {
		return true;
	}
	if (polling.maxCycles !== undefined && cycle >= polling.maxCycles) {
		return true;
	}
	if (totalIssues === 0 && polling.exitWhenIdle) {
		return true;
	}
	return false;
}

async function runProjectCycle(
	config: ResolvedProjectConfig,
	options: RunOptions,
	linear: LinearClient,
	cycle: number,
	polling: PollingSettings,
): Promise<number> {
	const projectLogger = logger.child({ projectId: config.id });
	const issues = await linear.fetchWork(options.issueArg);
	projectLogger.info(
		{ cycle, issueCount: issues.length, pollingEnabled: polling.enabled },
		"Fetched eligible Linear issues",
	);

	if (issues.length === 0) {
		projectLogger.info({ cycle }, "No eligible Linear issues found.");
	}

	for (const issue of issues) {
		await processIssue(config, linear, issue);
	}

	return issues.length;
}

async function processIssue(
	config: ResolvedProjectConfig,
	linear: LinearClient,
	issue: {
		id: string;
		identifier: string;
		title: string;
		url: string;
		state: {
			id: string;
			name: string;
		};
	},
): Promise<void> {
	const key = normalizeIssueKey(issue.identifier);
	const issueLogger = logger.child({ projectId: config.id, issueKey: key });
	const existing = await loadRunState(config.workspacePath, config.id, key);
	const isAssignedState = await linear.isAssignedState(issue.state.id);
	if (!existing && !isAssignedState) {
		issueLogger.info(
			{ issueState: issue.state.name, issueStateId: issue.state.id },
			"Skipping in-progress issue without resumable local run state",
		);
		return;
	}
	const runState: RunState =
		existing ??
		({
			projectId: config.id,
			projectName: config.name,
			workspacePath: config.executionPath,
			repository: {
				owner: config.repo.owner,
				name: config.repo.name,
				baseBranch: config.repo.baseBranch,
			},
			issue: {
				id: issue.id,
				key,
				title: issue.title,
				url: issue.url,
			},
			stage: "received",
			bugs: [],
			startedAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} satisfies RunState);
	issueLogger.info(
		buildIssueJobLogFields(runState, runState.stage, {
			resumed: existing !== null,
		}),
		"Taking issue job",
	);

	try {
		await executeIssue(config, linear, runState);
		issueLogger.info({ stage: runState.stage }, "Issue workflow finished");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		runState.lastError = message;
		runState.stage = "blocked";
		await saveRunState(config.workspacePath, runState);
		await safeLinearMoveToCanceled(linear, runState.issue.id);
		await safeLinearComment(
			linear,
			runState.issue.id,
			`PIV loop failed and moved issue to Canceled.\n\nError:\n${message}`,
		);
		issueLogger.error(
			{
				err: normalizeError(error),
				stage: runState.stage,
			},
			"Issue workflow failed",
		);
	}
}

export interface PollingSettings {
	enabled: boolean;
	intervalMs: number;
	maxCycles?: number;
	exitWhenIdle: boolean;
}

export function resolvePollingSettings(
	pollingConfig: PollingConfig,
	options: RunOptions,
): PollingSettings {
	return {
		enabled: options.poll === true,
		intervalMs: options.pollIntervalMs ?? pollingConfig.intervalMs,
		maxCycles: options.maxPollCycles ?? pollingConfig.maxCycles,
		exitWhenIdle: options.exitWhenIdle ?? pollingConfig.exitWhenIdle,
	};
}

export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface IssueJobLogFields {
	projectId: string;
	issueKey: string;
	issueId: string;
	issueTitle: string;
	stage: string;
	resumed?: true;
}

export function buildIssueJobLogFields(
	state: RunState,
	stage: string,
	options?: { resumed?: boolean },
): IssueJobLogFields {
	return {
		projectId: state.projectId,
		issueKey: state.issue.key,
		issueId: state.issue.id,
		issueTitle: state.issue.title,
		stage,
		...(options?.resumed ? { resumed: true as const } : {}),
	};
}

async function executeIssue(
	config: ResolvedProjectConfig,
	linear: LinearClient,
	state: RunState,
): Promise<void> {
	if (state.stage === "done" || state.stage === "blocked") {
		return;
	}

	if (state.stage === "received") {
		await linear.markStage(state.issue.id, "planning");
		await linear.comment(state.issue.id, "PIV loop started planning.");
		Object.assign(state, transitionStage(state, "planning"));
		await saveRunState(config.workspacePath, state);
	}

	if (state.stage === "planning") {
		logger.info(buildIssueJobLogFields(state, "planning"), "Planning issue");
		const prompt = await buildPlanPrompt(config.skills.plan, state.issue);
		const result = await runPlanSession(config, prompt);
		state.codexSessionId = result.sessionId ?? state.codexSessionId;
		state.planSummary = result.finalMessage || result.stdout;
		appendCodexUsage(state, "planning", result.usage);
		Object.assign(state, transitionStage(state, "implementing"));
		await saveRunState(config.workspacePath, state);
		await linear.markStage(state.issue.id, "implementing");
		await linear.comment(
			state.issue.id,
			buildPlanComment(state.issue.key, state.planSummary, result.usage),
		);
		logger.info(buildIssueJobLogFields(state, "planning"), "Plan completed");
	}

	if (state.stage === "implementing") {
		if (!state.codexSessionId) {
			throw new Error("Missing codex session id for implement step");
		}
		logger.info(
			buildIssueJobLogFields(state, "implementing"),
			"Implementing issue",
		);
		const prompt = await buildImplementPrompt(
			config.skills.implement,
			state.issue,
			state.planSummary ?? "",
		);
		const result = await runResumeSession(config, state.codexSessionId, prompt);
		state.implementationSummary = result.finalMessage || result.stdout;
		appendCodexUsage(state, "implementing", result.usage);

		if (config.dryRun) {
			state.pullRequest = {
				branch: `codex/${state.issue.key.toLowerCase()}`,
				title: `[codex] ${state.issue.key}: ${state.issue.title}`,
				url: "https://example.invalid/dry-run",
			};
		} else {
			state.pullRequest = await createDraftPrFromWorktree(
				config,
				state.issue.key,
				state.issue.title,
			);
		}

		Object.assign(state, transitionStage(state, "pr_created"));
		await saveRunState(config.workspacePath, state);
		await linear.markStage(state.issue.id, "pr_created");
		await linear.applyStageLabel(state.issue.id, "pr_created");
		await linear.comment(
			state.issue.id,
			buildImplementationComment(state.pullRequest.url, result.usage),
		);
		logger.info(
			buildIssueJobLogFields(state, "implementing"),
			"Implementation completed",
		);
	}

	if (state.stage === "pr_created") {
		Object.assign(state, transitionStage(state, "reviewing"));
		await saveRunState(config.workspacePath, state);
		await linear.markStage(state.issue.id, "reviewing");
		await linear.applyStageLabel(state.issue.id, "reviewing");
	}

	if (state.stage === "reviewing" || state.stage === "testing") {
		logger.info(buildIssueJobLogFields(state, "testing"), "Testing issue");
		await linear.markStage(state.issue.id, "testing");
		await linear.applyStageLabel(state.issue.id, "testing");
		Object.assign(state, transitionStage(state, "testing"));
		await saveRunState(config.workspacePath, state);

		const prompt = await buildReviewPrompt(
			config.skills.reviewTest,
			state.issue,
			state.pullRequest,
		);
		const review = await runReviewSession(config, prompt);
		const outcome = parseReviewOutcome(review.finalMessage || review.stdout);
		appendCodexUsage(state, "testing", review.usage);

		state.reviewSummary = outcome.summary;
		state.testingSummary = outcome.summary;
		state.bugs = outcome.bugs;
		await saveRunState(config.workspacePath, state);

		const reviewComment = buildReviewComment({
			issueKey: state.issue.key,
			passed: outcome.passed,
			summary: outcome.summary,
			usage: review.usage,
			bugs: outcome.bugs,
		});

		if (!config.dryRun && state.pullRequest) {
			await commentOnPr(config, state.pullRequest, reviewComment);
		}
		await linear.comment(state.issue.id, reviewComment);

		if (outcome.bugs.length > 0) {
			if (config.dryRun) {
				state.bugs = outcome.bugs;
			} else {
				state.bugs = await createBugIssues(
					config,
					outcome.bugs,
					state.issue.url,
					state.pullRequest?.url,
				);
			}
			Object.assign(state, transitionStage(state, "blocked"));
			await saveRunState(config.workspacePath, state);
			await linear.markCanceled(state.issue.id);
			await linear.comment(
				state.issue.id,
				buildBugsCanceledComment(state.bugs),
			);
			return;
		}

		Object.assign(state, transitionStage(state, "done"));
		await saveRunState(config.workspacePath, state);
		await linear.markStage(state.issue.id, "done");
		await linear.comment(state.issue.id, "Review/testing passed. Marked done.");
		logger.info(
			buildIssueJobLogFields(state, "testing"),
			"Review/testing completed",
		);
	}
}

export function appendCodexUsage(
	state: RunState,
	stage: CodexUsageRecord["stage"],
	usage:
		| { inputTokens?: number; outputTokens?: number; totalTokens?: number }
		| undefined,
): void {
	if (!usage) {
		return;
	}
	state.codexUsage = [
		...(state.codexUsage ?? []),
		{
			stage,
			inputTokens: usage.inputTokens,
			outputTokens: usage.outputTokens,
			totalTokens: usage.totalTokens,
			recordedAt: new Date().toISOString(),
		},
	];
}

async function safeLinearComment(
	linear: LinearClient,
	issueId: string,
	body: string,
): Promise<void> {
	const runLogger = logger.child({ issueId });
	try {
		await linear.comment(issueId, body);
	} catch (error) {
		runLogger.error(
			{ err: normalizeError(error) },
			"Failed to add Linear comment",
		);
	}
}

async function safeLinearMoveToCanceled(
	linear: LinearClient,
	issueId: string,
): Promise<void> {
	const runLogger = logger.child({ issueId, stage: "canceled" });
	try {
		await linear.markCanceled(issueId);
	} catch (error) {
		runLogger.error(
			{ err: normalizeError(error) },
			"Failed to move Linear issue to Canceled",
		);
	}
}
