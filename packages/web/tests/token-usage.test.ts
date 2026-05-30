import { describe, expect, it } from "bun:test";

import {
	buildTokenUsageActivity,
	formatTokenCount,
	summarizeTokenUsage,
} from "../src/components/issues-board/issue-task-detail-panel-utils";
import { parseTokenUsageRecord } from "../src/lib/api/server-state-client";
import type { TokenUsageRecord } from "../src/lib/api/types/client.types";

describe("token usage", () => {
	it("parses task-linked usage records", () => {
		expect(
			parseTokenUsageRecord({
				id: "usage-1",
				runId: "run-1",
				taskId: "task-1",
				taskExecutionLogId: "execution-1",
				stage: "planning",
				agentBackend: "codex",
				model: "gpt-5",
				inputTokens: 1200,
				outputTokens: 300,
				totalTokens: 1500,
				estimatedCostMicrousd: 19500,
				recordedAt: "2026-05-26T00:00:00.000Z",
			}),
		).toEqual({
			id: "usage-1",
			runId: "run-1",
			taskId: "task-1",
			taskExecutionLogId: "execution-1",
			stage: "planning",
			agentBackend: "codex",
			model: "gpt-5",
			inputTokens: 1200,
			outputTokens: 300,
			totalTokens: 1500,
			estimatedCostMicrousd: 19500,
			recordedAt: "2026-05-26T00:00:00.000Z",
		});
	});

	it("summarizes token usage by unique run", () => {
		const records: TokenUsageRecord[] = [
			usageRecord({ inputTokens: 1000, outputTokens: 200, totalTokens: 1200 }),
			usageRecord({
				id: "usage-2",
				runId: "run-1",
				inputTokens: 500,
				outputTokens: 100,
				totalTokens: 600,
			}),
			usageRecord({
				id: "usage-3",
				runId: "run-2",
				inputTokens: 50,
				outputTokens: 25,
				totalTokens: 75,
			}),
		];

		expect(summarizeTokenUsage(records)).toEqual({
			inputTokens: 1550,
			outputTokens: 325,
			totalTokens: 1875,
			estimatedCostMicrousd: null,
			runs: 2,
		});
		expect(formatTokenCount(1550)).toBe("1.6K");
	});

	it("builds daily activity data for token usage calendars", () => {
		const records: TokenUsageRecord[] = [
			usageRecord({
				id: "usage-1",
				recordedAt: "2026-05-27T23:55:00.000Z",
				totalTokens: 100,
			}),
			usageRecord({
				id: "usage-2",
				recordedAt: "2026-05-27T01:05:00.000Z",
				totalTokens: 300,
			}),
			usageRecord({
				id: "usage-3",
				recordedAt: "2026-05-29T10:00:00.000Z",
				totalTokens: 800,
			}),
			usageRecord({
				id: "usage-4",
				recordedAt: "not-a-date",
				totalTokens: 999,
			}),
		];

		expect(
			buildTokenUsageActivity(records, {
				days: 4,
				endDate: "2026-05-30T12:00:00.000Z",
			}),
		).toEqual([
			{ count: 400, date: "2026-05-27", level: 2 },
			{ count: 0, date: "2026-05-28", level: 0 },
			{ count: 800, date: "2026-05-29", level: 4 },
			{ count: 0, date: "2026-05-30", level: 0 },
		]);
	});
});

function usageRecord(
	overrides: Partial<TokenUsageRecord> = {},
): TokenUsageRecord {
	return {
		id: "usage-1",
		runId: "run-1",
		taskId: "task-1",
		taskExecutionLogId: "execution-1",
		stage: "planning",
		agentBackend: null,
		model: null,
		inputTokens: 0,
		outputTokens: 0,
		totalTokens: 0,
		estimatedCostMicrousd: null,
		recordedAt: "2026-05-26T00:00:00.000Z",
		...overrides,
	};
}
