"use client";

import {
	Bot,
	ChevronDown,
	CircleDot,
	MessageSquareText,
	MoreHorizontal,
} from "lucide-react";
import type { ReactElement } from "react";

import type { ProjectBoardTaskRecord, TaskActivityRecord } from "@/lib/api";
import { isApiRequestError } from "@/lib/api";
import { useTaskActivityQuery } from "@/lib/api/task-activity-query";

import { ActivityRichText } from "./issue-activity-rich-text";
import { createTaskCreatedActivity } from "./issue-activity-utils";

export function IssueActivityPanel({
	task,
}: {
	task: ProjectBoardTaskRecord;
}): ReactElement {
	const activityQuery = useTaskActivityQuery(task.id);

	return (
		<section className="grid gap-4">
			<header className="flex items-center justify-between gap-3">
				<h2 className="m-0 text-xl font-semibold text-theme-primary">
					Activity
				</h2>
			</header>
			{renderActivityContent(activityQuery, task)}
		</section>
	);
}

function renderActivityContent(
	activityQuery: ReturnType<typeof useTaskActivityQuery>,
	task: ProjectBoardTaskRecord,
): ReactElement {
	if (activityQuery.isLoading) {
		return <ActivityState label="Loading activity" />;
	}
	if (activityQuery.error) {
		if (
			isApiRequestError(activityQuery.error) &&
			activityQuery.error.status === 404
		) {
			return <ActivityList activities={[createTaskCreatedActivity(task)]} />;
		}
		return <ActivityState label={activityQuery.error.message} />;
	}
	const activities = activityQuery.data?.activities ?? [];
	if (activities.length === 0) {
		return <ActivityState label="No activity yet" />;
	}
	return <ActivityList activities={activities} />;
}

function ActivityList({
	activities,
}: {
	activities: TaskActivityRecord[];
}): ReactElement {
	return (
		<div className="grid gap-3">
			<div className="flex h-8 items-center gap-2 rounded-md border border-theme-default bg-theme-control-subtle px-2 text-sm text-theme-secondary">
				<ChevronDown size={16} />
				<span>{formatCount(activities.length)}</span>
			</div>
			<div className="grid gap-3">
				{activities.map((activity) => (
					<ActivityItem activity={activity} key={activity.id} />
				))}
			</div>
		</div>
	);
}

function ActivityItem({
	activity,
}: {
	activity: TaskActivityRecord;
}): ReactElement {
	const hasCard = Boolean(activity.body.trim()) || activity.steps?.length;
	if (hasCard) {
		return <ActivityCard activity={activity} />;
	}
	return (
		<div className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 text-sm text-theme-secondary">
			<ActivityIcon activity={activity} />
			<p className="m-0 min-w-0">
				<span className="font-medium text-theme-secondary">
					{activity.actorId}
				</span>{" "}
				{activity.title}
			</p>
			<time className="whitespace-nowrap text-theme-muted">
				{formatRelativeTime(activity.createdAt)}
			</time>
		</div>
	);
}

function ActivityCard({
	activity,
}: {
	activity: TaskActivityRecord;
}): ReactElement {
	return (
		<article className="rounded-lg border border-theme-default bg-theme-card p-5">
			<header className="mb-5 flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<ActivityIcon activity={activity} isLarge />
					<div className="min-w-0">
						<p className="m-0 truncate text-sm">
							<span className="font-semibold text-theme-primary">
								{activity.actorId}
							</span>{" "}
							<span className="text-theme-muted">
								{formatRelativeTime(activity.createdAt)}
							</span>
						</p>
						<p className="m-0 text-xs text-theme-muted">{activity.title}</p>
					</div>
				</div>
				<MoreHorizontal className="text-theme-muted" size={18} />
			</header>
			{activity.body.trim() ? <ActivityRichText body={activity.body} /> : null}
			{activity.steps?.length ? <ActivitySteps activity={activity} /> : null}
		</article>
	);
}

function ActivitySteps({
	activity,
}: {
	activity: TaskActivityRecord;
}): ReactElement {
	return (
		<div className="mt-4 grid gap-2 border-t border-theme-default pt-4">
			{activity.steps?.map((step) => (
				<div
					className="grid gap-1 rounded-md border border-theme-default bg-theme-control px-3 py-2 text-sm"
					key={step.id}
				>
					<div className="flex items-center justify-between gap-3">
						<span className="font-medium text-theme-secondary">
							{step.action}
						</span>
						<span className="text-xs text-theme-muted">{step.status}</span>
					</div>
					{step.detail ? (
						<p className="m-0 text-theme-muted">{step.detail}</p>
					) : null}
				</div>
			))}
		</div>
	);
}

function ActivityIcon({
	activity,
	isLarge = false,
}: {
	activity: TaskActivityRecord;
	isLarge?: boolean;
}): ReactElement {
	const size = isLarge ? "h-8 w-8" : "h-5 w-5";
	const iconSize = isLarge ? 16 : 12;
	const Icon =
		activity.kind === "created"
			? CircleDot
			: activity.actorType === "agent"
				? Bot
				: MessageSquareText;
	return (
		<span
			className={`${size} grid shrink-0 place-items-center rounded-full bg-theme-interactive text-theme-secondary`}
		>
			<Icon size={iconSize} />
		</span>
	);
}

function ActivityState({ label }: { label: string }): ReactElement {
	return (
		<div className="grid min-h-32 place-items-center rounded-lg border border-theme-default bg-theme-card text-sm text-theme-muted">
			{label}
		</div>
	);
}

function formatCount(count: number): string {
	return count === 1 ? "1 activity" : `${count} activities`;
}

function formatRelativeTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
	const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
		["day", 86400],
		["hour", 3600],
		["minute", 60],
	];
	const formatter = new Intl.RelativeTimeFormat(undefined, {
		numeric: "auto",
	});
	for (const [unit, seconds] of units) {
		if (Math.abs(diffSeconds) >= seconds) {
			return formatter.format(Math.round(diffSeconds / seconds), unit);
		}
	}
	return formatter.format(diffSeconds, "second");
}
