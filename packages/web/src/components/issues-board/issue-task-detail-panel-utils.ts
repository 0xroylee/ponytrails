import type { TokenUsageRecord } from "@/lib/api";

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
