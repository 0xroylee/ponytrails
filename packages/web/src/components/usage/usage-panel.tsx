"use client";

import { CalendarDays, Gauge, RefreshCw } from "lucide-react";
import type { ReactElement } from "react";
import { ActivityCalendar } from "react-activity-calendar";

import {
	buildTokenUsageActivity,
	formatEstimatedCostMicrousd,
	formatTokenCount,
	summarizeTokenUsage,
} from "@/components/issues-board/issue-task-detail-panel-utils";
import { Typography } from "@/components/ui/typography";
import type { TokenUsageRecord } from "@/lib/api";
import { useTokenUsageQuery } from "@/lib/api/queries";

const calendarTheme = {
	dark: [
		"hsl(var(--surface-inset))",
		"#274c77",
		"#2a9d8f",
		"#e9c46a",
		"#f25f4c",
	],
};

export function UsagePanel(): ReactElement {
	const usageQuery = useTokenUsageQuery({ refetchIntervalMs: 5000 });
	const records = usageQuery.data ?? [];
	const summary = summarizeTokenUsage(records);
	const activity = buildTokenUsageActivity(records);

	if (usageQuery.isPending) {
		return <UsageState message="Loading token usage..." title="Usage" />;
	}

	if (usageQuery.isError) {
		return (
			<UsageState
				message={usageQuery.error.message || "Failed to load token usage."}
				title="Usage"
				tone="error"
			/>
		);
	}

	return (
		<section className="grid gap-4" aria-labelledby="usage-title">
			<header className="flex flex-wrap items-end justify-between gap-3">
				<div className="grid gap-1">
					<Typography as="h1" id="usage-title" variant="pageTitle">
						Usage
					</Typography>
					<Typography variant="description">
						Token activity and workflow volume.
					</Typography>
				</div>
				<Typography className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2">
					<RefreshCw size={15} />
					{formatRefreshedAt(usageQuery.dataUpdatedAt)}
				</Typography>
			</header>
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<UsageMetric
					label="Total"
					value={formatTokenCount(summary.totalTokens)}
				/>
				<UsageMetric
					label="Input"
					value={formatTokenCount(summary.inputTokens)}
				/>
				<UsageMetric
					label="Output"
					value={formatTokenCount(summary.outputTokens)}
				/>
				<UsageMetric label="Runs" value={String(summary.runs)} />
			</div>
			<TokenActivityCalendar activity={activity} records={records} />
			<UsageCostPanel value={summary.estimatedCostMicrousd} />
		</section>
	);
}

function UsageMetric({
	label,
	value,
}: {
	label: string;
	value: string;
}): ReactElement {
	return (
		<div className="grid gap-1 rounded-lg border border-border bg-card p-4">
			<Typography variant="muted">{label}</Typography>
			<Typography className="text-xl text-zinc-100" variant="cardTitle">
				{value}
			</Typography>
		</div>
	);
}

function TokenActivityCalendar({
	activity,
	records,
}: {
	activity: ReturnType<typeof buildTokenUsageActivity>;
	records: TokenUsageRecord[];
}): ReactElement {
	return (
		<section className="grid gap-3 rounded-lg border border-border bg-card p-4">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="grid gap-1">
					<Typography
						as="h2"
						className="inline-flex items-center gap-2"
						variant="sectionTitle"
					>
						<CalendarDays size={17} />
						Token activity
					</Typography>
					<Typography variant="description">
						{records.length
							? `Last recorded ${formatLatestRecordedAt(records)}`
							: "No token usage recorded yet."}
					</Typography>
				</div>
				<Typography variant="metadata">Last 365 days</Typography>
			</header>
			<div className="overflow-x-auto pb-1">
				<ActivityCalendar
					blockMargin={4}
					blockRadius={3}
					blockSize={12}
					colorScheme="dark"
					data={activity}
					fontSize={12}
					labels={{
						legend: { less: "Less", more: "More" },
						totalCount: "{{count}} tokens in the last year",
					}}
					showWeekdayLabels={["mon", "wed", "fri"]}
					theme={calendarTheme}
				/>
			</div>
		</section>
	);
}

function UsageCostPanel({
	value,
}: {
	value: number | null;
}): ReactElement {
	return (
		<section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
			<div className="grid gap-1">
				<Typography
					as="h2"
					className="inline-flex items-center gap-2"
					variant="sectionTitle"
				>
					<Gauge size={17} />
					Estimated cost
				</Typography>
				<Typography variant="description">
					Available when usage rows include cost estimates.
				</Typography>
			</div>
			<Typography className="text-xl text-zinc-100" variant="cardTitle">
				{formatEstimatedCostMicrousd(value)}
			</Typography>
		</section>
	);
}

function UsageState({
	message,
	title,
	tone = "default",
}: {
	message: string;
	title: string;
	tone?: "default" | "error";
}): ReactElement {
	const className =
		tone === "error"
			? "grid gap-3 rounded-lg border border-red-900/50 bg-red-950/20 p-4"
			: "grid gap-3 rounded-lg border border-border bg-card p-4";

	return (
		<section className={className}>
			<Typography className="text-zinc-200" variant="sectionTitle">
				{title}
			</Typography>
			<Typography variant={tone === "error" ? "error" : "description"}>
				{message}
			</Typography>
		</section>
	);
}

function formatRefreshedAt(value: number): string {
	return value
		? `Updated ${formatTime(new Date(value).toISOString())}`
		: "Updated";
}

function formatLatestRecordedAt(records: TokenUsageRecord[]): string {
	const timestamps = records
		.map((record) => new Date(record.recordedAt).getTime())
		.filter((value) => !Number.isNaN(value));
	const latest = Math.max(...timestamps);
	return Number.isFinite(latest)
		? formatTime(new Date(latest).toISOString())
		: "";
}

function formatTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
		Math.round((date.getTime() - Date.now()) / 60000),
		"minute",
	);
}
