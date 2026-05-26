"use client";

import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";

import {
	formatEstimatedCostMicrousd,
	formatTokenCount,
} from "../issues-board/issue-task-detail-panel-utils";
import type { ChatMissionProgressViewModel } from "./types/chat-mission-progress.types";

export function MissionUsageSummary({
	mission,
}: {
	mission: ChatMissionProgressViewModel;
}): ReactElement | null {
	if (!mission.usageSummary) {
		return null;
	}
	return (
		<section
			className="grid gap-2 rounded-md border border-border bg-surface-inset px-3 py-2"
			data-mission-usage-summary="true"
		>
			<Typography className="text-muted-foreground" variant="eyebrow">
				Estimated usage
			</Typography>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
				<UsageMetric
					label="Cost"
					value={formatEstimatedCostMicrousd(
						mission.usageSummary.estimatedCostMicrousd,
					)}
				/>
				<UsageMetric
					label="Total"
					value={formatTokenCount(mission.usageSummary.totalTokens)}
				/>
				<UsageMetric
					label="Input"
					value={formatTokenCount(mission.usageSummary.inputTokens)}
				/>
				<UsageMetric
					label="Output"
					value={formatTokenCount(mission.usageSummary.outputTokens)}
				/>
			</div>
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
		<div className="grid gap-1">
			<Typography className="text-muted-foreground" variant="metadata">
				{label}
			</Typography>
			<Typography className="truncate text-zinc-200" variant="cardTitle">
				{value}
			</Typography>
		</div>
	);
}
