"use client";

import { Activity, CircleAlert, CircleCheck, RefreshCw } from "lucide-react";
import type { ReactElement } from "react";

import type { PollingEventRecord, PollingStatusRecord } from "@/lib/api";
import { usePollingStatusQuery } from "@/lib/api/queries";

export function PollingMonitorPanel(): ReactElement {
	const query = usePollingStatusQuery({ refetchIntervalMs: 5000 });
	if (query.isLoading) {
		return <PollingState label="Loading polling status" />;
	}
	if (query.error) {
		return <PollingState label={query.error.message} />;
	}
	const pollers = query.data?.pollers ?? [];
	const events = query.data?.events ?? [];
	return (
		<section className="grid h-full min-h-0 gap-4 overflow-auto p-4 text-theme-primary">
			<header className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="m-0 text-2xl font-semibold">Autopilot</h1>
					<p className="m-0 mt-1 text-sm text-theme-secondary">
						Polling health and operational events
					</p>
				</div>
				<div className="flex items-center gap-2 text-sm text-theme-secondary">
					<RefreshCw size={16} />
					<span>{formatRefreshedAt(query.dataUpdatedAt)}</span>
				</div>
			</header>
			{pollers.length ? (
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{pollers.map((poller) => (
						<PollerTile key={poller.id} poller={poller} />
					))}
				</div>
			) : (
				<PollingState label="No poller status recorded" />
			)}
			<EventLog events={events} />
		</section>
	);
}

function PollerTile({ poller }: { poller: PollingStatusRecord }): ReactElement {
	const working = isPollerWorking(poller);
	const Icon = working ? CircleCheck : CircleAlert;
	return (
		<article className="grid gap-3 rounded-lg border border-theme-default bg-theme-card p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="m-0 truncate text-base font-semibold">
						{formatPollerName(poller)}
					</p>
					<p className="m-0 text-xs text-theme-muted">{poller.id}</p>
				</div>
				<Icon
					className={working ? "text-emerald-400" : "text-amber-400"}
					size={20}
				/>
			</div>
			<div className="grid grid-cols-2 gap-2 text-sm">
				<Metric label="State" value={poller.state} />
				<Metric label="Last success" value={formatTime(poller.lastSuccessAt)} />
				<Metric label="Issues" value={String(poller.lastIssueCount)} />
				<Metric label="Ready tasks" value={String(poller.lastReadyTaskCount)} />
				<Metric label="Dispatches" value={String(poller.lastDispatchCount)} />
				<Metric label="Failures" value={String(poller.consecutiveFailures)} />
			</div>
			{poller.lastError ? (
				<p className="m-0 rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
					{poller.lastError}
				</p>
			) : null}
		</article>
	);
}

function Metric({
	label,
	value,
}: { label: string; value: string }): ReactElement {
	return (
		<div className="rounded-md border border-theme-default bg-theme-subtle px-3 py-2">
			<p className="m-0 text-xs text-theme-muted">{label}</p>
			<p className="m-0 truncate text-sm text-theme-secondary">{value}</p>
		</div>
	);
}

function EventLog({ events }: { events: PollingEventRecord[] }): ReactElement {
	return (
		<section className="min-h-0 rounded-lg border border-theme-default bg-theme-card">
			<header className="flex items-center gap-2 border-b border-theme-default px-4 py-3">
				<Activity size={18} />
				<h2 className="m-0 text-base font-semibold">Recent Polling Events</h2>
			</header>
			{events.length ? (
				<div className="overflow-auto">
					<table className="w-full min-w-[48rem] border-collapse text-left text-sm">
						<thead className="text-xs uppercase text-theme-muted">
							<tr>
								<th className="px-4 py-3 font-medium">Time</th>
								<th className="px-4 py-3 font-medium">Poller</th>
								<th className="px-4 py-3 font-medium">Level</th>
								<th className="px-4 py-3 font-medium">Type</th>
								<th className="px-4 py-3 font-medium">Message</th>
							</tr>
						</thead>
						<tbody>
							{events.map((event) => (
								<tr className="border-t border-theme-default" key={event.id}>
									<td className="px-4 py-3 text-theme-muted">
										{formatTime(event.createdAt)}
									</td>
									<td className="px-4 py-3 text-theme-secondary">
										{event.pollerId}
									</td>
									<td className="px-4 py-3">{event.level}</td>
									<td className="px-4 py-3 text-theme-secondary">
										{event.eventType}
									</td>
									<td className="px-4 py-3 text-theme-secondary">
										{event.message}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<PollingState label="No polling events recorded" />
			)}
		</section>
	);
}

function PollingState({ label }: { label: string }): ReactElement {
	return (
		<div className="grid min-h-32 place-items-center rounded-lg border border-theme-default bg-theme-card text-sm text-theme-muted">
			{label}
		</div>
	);
}

function isPollerWorking(poller: PollingStatusRecord): boolean {
	if (poller.state === "running") {
		return true;
	}
	if (!poller.lastSuccessAt) {
		return false;
	}
	const lastSuccess = new Date(poller.lastSuccessAt).getTime();
	if (Number.isNaN(lastSuccess)) {
		return false;
	}
	const freshnessMs = Math.max(poller.intervalMs * 3, 5 * 60 * 1000);
	return Date.now() - lastSuccess <= freshnessMs;
}

function formatPollerName(poller: PollingStatusRecord): string {
	return poller.projectId
		? `${poller.sourceType} / ${poller.projectId}`
		: poller.sourceType;
}

function formatRefreshedAt(value: number): string {
	return value
		? `Updated ${formatTime(new Date(value).toISOString())}`
		: "Updated";
}

function formatTime(value: string | null): string {
	if (!value) {
		return "never";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
		Math.round((date.getTime() - Date.now()) / 60000),
		"minute",
	);
}
