"use client";

import { Bot } from "lucide-react";
import { type ReactElement, useMemo, useState } from "react";

import type { AgentRecord } from "@/lib/api";
import { useAgentsQuery } from "@/lib/api/queries";

import { AgentDetailDialog } from "./agent-detail-dialog";

export function AgentsPanel(): ReactElement {
	const agentsQuery = useAgentsQuery();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selectedAgent = useMemo(
		() => agentsQuery.data?.find((agent) => agent.id === selectedId) ?? null,
		[agentsQuery.data, selectedId],
	);

	if (agentsQuery.isPending) {
		return (
			<section className="grid gap-3 rounded-lg border border-theme-default bg-theme-card p-4">
				<h2 className="m-0 text-base font-semibold text-theme-secondary">
					Agents
				</h2>
				<p className="m-0 text-sm text-theme-muted">
					Loading available agents...
				</p>
			</section>
		);
	}

	if (agentsQuery.isError) {
		return (
			<section className="grid gap-3 rounded-lg border border-red-900/50 bg-red-950/20 p-4">
				<h2 className="m-0 text-base font-semibold text-red-200">Agents</h2>
				<p className="m-0 text-sm text-red-100">
					{agentsQuery.error.message || "Failed to load agents."}
				</p>
			</section>
		);
	}

	if (!agentsQuery.data || agentsQuery.data.length === 0) {
		return (
			<section className="grid gap-3 rounded-lg border border-theme-default bg-theme-card p-4">
				<h2 className="m-0 text-base font-semibold text-theme-secondary">
					Agents
				</h2>
				<p className="m-0 text-sm text-theme-muted">No agents are available.</p>
			</section>
		);
	}

	return (
		<section className="grid gap-3 rounded-lg border border-theme-default bg-theme-card p-4">
			<header className="grid gap-1">
				<h2 className="m-0 text-base font-semibold text-theme-secondary">
					Agents
				</h2>
				<p className="m-0 text-sm text-theme-muted">
					Select an agent to view and update runtime details.
				</p>
			</header>
			<ul className="m-0 grid list-none gap-2 p-0">
				{agentsQuery.data.map((agent) => (
					<AgentRow
						key={agent.id}
						agent={agent}
						onOpen={() => setSelectedId(agent.id)}
					/>
				))}
			</ul>
			{selectedAgent ? (
				<AgentDetailDialog
					agent={selectedAgent}
					onClose={() => setSelectedId(null)}
				/>
			) : null}
		</section>
	);
}

function AgentRow({
	agent,
	onOpen,
}: {
	agent: AgentRecord;
	onOpen: () => void;
}): ReactElement {
	return (
		<li>
			<button
				className="grid w-full gap-2 rounded-md border border-theme-default bg-theme-control p-3 text-left transition hover:border-theme-strong hover-bg-theme-subtle"
				onClick={onOpen}
				type="button"
			>
				<div className="flex items-center justify-between gap-2">
					<span className="inline-flex items-center gap-2 text-sm font-medium text-theme-primary">
						<Bot size={15} />
						{agent.name}
					</span>
					<span className="text-xs text-theme-muted">{agent.id}</span>
				</div>
				<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-theme-secondary">
					<span>{agent.runtime}</span>
					<span>{agent.model}</span>
					<span>Concurrency {agent.concurrency}</span>
					<span>Owner {agent.owner}</span>
				</div>
				{agent.description ? (
					<p className="m-0 text-xs text-theme-muted">{agent.description}</p>
				) : null}
			</button>
		</li>
	);
}
