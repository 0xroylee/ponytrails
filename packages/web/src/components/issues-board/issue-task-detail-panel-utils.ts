import type { Activity } from "react-github-calendar";

import type { TokenUsageRecord } from "@/lib/api";

const DAY_MS = 24 * 60 * 60 * 1000;

export function summarizeTokenUsage(records: TokenUsageRecord[]): {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	estimatedCostMicrousd: number | null;
	runs: number;
} {
	const runIds = new Set<string>();
	const totals = records.reduce(
		(summary, record) => {
			runIds.add(record.runId);
			return {
				inputTokens: summary.inputTokens + record.inputTokens,
				outputTokens: summary.outputTokens + record.outputTokens,
				totalTokens: summary.totalTokens + record.totalTokens,
				estimatedCostMicrousd:
					record.estimatedCostMicrousd === null
						? summary.estimatedCostMicrousd
						: summary.estimatedCostMicrousd + record.estimatedCostMicrousd,
			};
		},
		{
			inputTokens: 0,
			outputTokens: 0,
			totalTokens: 0,
			estimatedCostMicrousd: 0,
		},
	);
	const hasCost = records.some(
		(record) => record.estimatedCostMicrousd !== null,
	);
	return {
		...totals,
		estimatedCostMicrousd: hasCost ? totals.estimatedCostMicrousd : null,
		runs: runIds.size,
	};
}

export function formatTokenCount(value: number): string {
	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits: value >= 1000 ? 1 : 0,
		notation: "compact",
	}).format(value);
}

export function formatEstimatedCostMicrousd(value: number | null): string {
	if (value === null) {
		return "Estimate unavailable";
	}
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: value >= 10_000 ? 2 : 4,
		maximumFractionDigits: value >= 10_000 ? 2 : 4,
	}).format(value / 1_000_000);
}

export function buildTokenUsageActivity(
	records: TokenUsageRecord[],
	options: { days?: number; endDate?: Date | string } = {},
): Activity[] {
	const dayCount = Math.max(1, Math.floor(options.days ?? 365));
	const endDate = normalizeDate(options.endDate ?? new Date());
	const endTime = utcDayTime(endDate);
	const totalsByDate = new Map<string, number>();

	for (let index = dayCount - 1; index >= 0; index -= 1) {
		const date = toDateKey(new Date(endTime - index * DAY_MS));
		totalsByDate.set(date, 0);
	}

	for (const record of records) {
		const recordedAt = normalizeDate(record.recordedAt);
		if (!recordedAt) {
			continue;
		}
		const date = toDateKey(recordedAt);
		const current = totalsByDate.get(date);
		if (current === undefined) {
			continue;
		}
		totalsByDate.set(date, current + record.totalTokens);
	}

	const maxCount = Math.max(...totalsByDate.values());
	return Array.from(totalsByDate, ([date, count]) => ({
		date,
		count,
		level: activityLevel(count, maxCount),
	}));
}

export function formatDueDate(value: string | null): string {
	if (!value) {
		return "No due date";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
		date,
	);
}

function normalizeDate(value: Date | string): Date | null {
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function utcDayTime(date: Date | null): number {
	const safeDate = date ?? new Date();
	return Date.UTC(
		safeDate.getUTCFullYear(),
		safeDate.getUTCMonth(),
		safeDate.getUTCDate(),
	);
}

function toDateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function activityLevel(count: number, maxCount: number): Activity["level"] {
	if (count <= 0 || maxCount <= 0) {
		return 0;
	}
	const ratio = count / maxCount;
	if (ratio <= 0.25) {
		return 1;
	}
	if (ratio <= 0.5) {
		return 2;
	}
	if (ratio <= 0.75) {
		return 3;
	}
	return 4;
}
