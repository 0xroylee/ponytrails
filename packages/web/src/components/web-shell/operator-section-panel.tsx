import type { ReactElement } from "react";

import { AgentMonitorShell } from "@/components/agent-monitor/agent-monitor-shell";
import { TaskCreatePanel } from "@/components/task-create/task-create-panel";

import { sectionContentByKey } from "./web-shell.constants";
import type { SidebarNavKey } from "./web-shell.types";

export function OperatorSectionPanel({
	sectionKey,
}: {
	sectionKey: SidebarNavKey;
}): ReactElement {
	const content = sectionContentByKey[sectionKey];

	return (
		<section
			style={{
				padding: "clamp(0.75rem, 3vw, 1.25rem)",
				display: "grid",
				gap: "1rem",
				alignContent: "start",
				height: "100dvh",
				maxHeight: "100dvh",
				minWidth: 0,
				overflow: "auto",
			}}
		>
			<header
				style={{
					border: "1px solid var(--border-default)",
					borderRadius: "8px",
					background: "var(--bg-card)",
					color: "var(--text-primary)",
					padding: "1rem",
				}}
			>
				<h1 style={{ margin: "0 0 0.45rem" }}>{content.heading}</h1>
				<p style={{ margin: 0, color: "var(--text-muted)" }}>
					{content.description}
				</p>
			</header>
			<div
				style={{
					display: "grid",
					gap: "1rem",
					gridTemplateColumns:
						"repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
					minWidth: 0,
				}}
			>
				<TaskCreatePanel />
				<AgentMonitorShell />
			</div>
		</section>
	);
}
