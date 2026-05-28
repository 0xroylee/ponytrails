import { logger } from "../../../utils/logger";
import type {
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunOptions,
} from "../../types";
import { IssueProcessor } from "../mission/issue-processor";
import type {
	PollingSettings,
	WorkflowLinearClient,
	WorkflowRuntime,
} from "../types/workflow.types";
import { buildRunLeaseOwnerId } from "../workflow-lease";
import { processIssueQueueBounded } from "../workflow-queue";
import { IssueQueueBuilder } from "./issue-queue-builder";
import { emitPollingProgress } from "./polling-events";
import { recordCliPollingEvent } from "./polling-observability";

export class ProjectCycleRunner {
	constructor(
		private readonly config: ResolvedProjectConfig,
		private readonly notifications: ResolvedNotificationConfig,
		private readonly options: RunOptions,
		private readonly linear: WorkflowLinearClient,
		private readonly polling: PollingSettings,
		private readonly runtime: WorkflowRuntime,
	) {}

	async run(cycle: number): Promise<number> {
		const projectLogger = logger.child({ projectId: this.config.id });
		const startedAt = new Date().toISOString();
		projectLogger.info(
			{
				cycle,
				pollingEnabled: this.polling.enabled,
				pollForever: this.options.pollForever === true,
				issueArg: this.options.issueArg,
				pollIntervalMs: this.polling.intervalMs,
			},
			"Starting workflow polling cycle",
		);
		await this.recordCycleStarted(cycle, startedAt);
		const { issueQueue, staleRetryCount } = await new IssueQueueBuilder(
			this.config,
			this.options,
			this.linear,
			this.polling,
			this.runtime,
		).build();
		projectLogger.info(
			{
				cycle,
				issueCount: issueQueue.length,
				staleRetryCount,
				pollingEnabled: this.polling.enabled,
			},
			"Fetched eligible board tasks",
		);
		emitPollingProgress(this.config.id, "cycle_fetched", "succeeded", {
			detail: `fetched ${issueQueue.length} issue(s)`,
		});
		if (issueQueue.length === 0) {
			projectLogger.info({ cycle }, "No eligible board tasks found.");
			emitPollingProgress(this.config.id, "cycle_no_work", "succeeded", {
				detail: `cycle ${cycle} no eligible issues`,
			});
		}

		await processIssueQueueBounded(
			issueQueue,
			resolveEffectiveIssueConcurrency(this.config, this.options),
			async (issue) => this.createIssueProcessor().process(issue),
		);
		await this.recordCycleCompleted(cycle, issueQueue.length, staleRetryCount);
		return issueQueue.length;
	}

	private createIssueProcessor(): IssueProcessor {
		const effectiveConcurrency = resolveEffectiveIssueConcurrency(
			this.config,
			this.options,
		);
		return new IssueProcessor({
			config: this.config,
			notifications: this.notifications,
			linear: this.linear,
			options: this.options,
			effectiveConcurrency,
			leaseTimeoutMs: this.polling.staleRunTimeoutMs,
			leaseOwnerId: buildRunLeaseOwnerId(),
			runtime: this.runtime,
		});
	}

	private async recordCycleStarted(
		cycle: number,
		startedAt: string,
	): Promise<void> {
		await recordCliPollingEvent(this.config, this.polling, {
			eventType: "cycle_started",
			level: "info",
			message: "Task polling cycle started",
			state: "running",
			cycle,
			startedAt,
		});
		emitPollingProgress(this.config.id, "cycle_started", "started", {
			detail: `cycle ${cycle} started`,
		});
	}

	private async recordCycleCompleted(
		cycle: number,
		issueCount: number,
		staleRetryCount: number,
	): Promise<void> {
		await recordCliPollingEvent(this.config, this.polling, {
			eventType: "cycle_completed",
			level: "info",
			message: "Task polling cycle completed",
			state: "success",
			cycle,
			counts: { issueCount, staleRetryCount },
			finishedAt: new Date().toISOString(),
			successAt: new Date().toISOString(),
			lastError: null,
		});
		emitPollingProgress(this.config.id, "cycle_completed", "succeeded", {
			detail: `cycle ${cycle} completed`,
		});
	}
}

export function resolveEffectiveIssueConcurrency(
	config: ResolvedProjectConfig,
	options: RunOptions,
): number {
	return options.concurrency ?? config.workflow.issueConcurrency;
}
