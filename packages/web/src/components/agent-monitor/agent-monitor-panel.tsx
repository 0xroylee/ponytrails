"use client";

import type { ReactElement } from "react";

import type {
	AgentHealthViewModel,
	WorkflowTab,
} from "@/lib/agents/agent-monitor.types";

import { AgentMonitorSkeleton } from "./agent-monitor-skeleton";

interface AgentMonitorPanelProps {
	health: AgentHealthViewModel;
	activeWorkflowTab: WorkflowTab;
	showDetails: boolean;
	onWorkflowTabChange: (tab: WorkflowTab) => void;
	onToggleDetails: () => void;
}

export function AgentMonitorPanel({
	health,
	activeWorkflowTab,
	showDetails,
	onWorkflowTabChange,
	onToggleDetails,
}: AgentMonitorPanelProps): ReactElement {
	if (health.status === "loading") {
		return <AgentMonitorSkeleton />;
	}

	return (
		<section style={{ maxWidth: "44rem", width: "100%" }}>
			<h1 style={{ margin: "0 0 0.75rem" }}>ADHD.ai Agent Monitor</h1>
			<p style={{ margin: "0 0 1rem", color: "#a1a1aa" }}>{health.summary}</p>
			<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
				<button
					type="button"
					onClick={() => onWorkflowTabChange("overview")}
					aria-pressed={activeWorkflowTab === "overview"}
					style={buttonStyle}
				>
					Overview
				</button>
				<button
					type="button"
					onClick={() => onWorkflowTabChange("reviews")}
					aria-pressed={activeWorkflowTab === "reviews"}
					style={buttonStyle}
				>
					Reviews
				</button>
				<button type="button" onClick={onToggleDetails} style={buttonStyle}>
					{showDetails ? "Hide details" : "Show details"}
				</button>
			</div>
			<div style={{ color: "#e4e4e7" }}>
				<p style={{ margin: "0 0 0.5rem" }}>Server status: {health.status}</p>
				{showDetails ? (
					<p style={{ margin: 0 }}>
						Active workflow view: <strong>{activeWorkflowTab}</strong>
					</p>
				) : null}
			</div>
		</section>
	);
}

const buttonStyle = {
	border: "1px solid #3f3f46",
	borderRadius: "6px",
	background: "#27272a",
	color: "#f4f4f5",
	cursor: "pointer",
	padding: "0.5rem 0.75rem",
} as const;
