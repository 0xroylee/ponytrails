import type { ReactElement } from "react";

import { AgentMonitorShell } from "@/components/agent-monitor/agent-monitor-shell";
import { SettingsPanelContent } from "@/components/settings/settings-panel-content";
import type { SettingsView } from "@/components/settings/types/settings-navigation.types";
import { TaskCreatePanel } from "@/components/task-create/task-create-panel";
import { Typography } from "@/components/ui/typography";

import type { SidebarNavKey } from "./types/web-shell.types";
import { sectionContentByKey } from "./web-shell.constants";

export function OperatorSectionPanel({
	sectionKey,
	settingsView = "models",
}: {
	sectionKey: SidebarNavKey;
	settingsView?: SettingsView;
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
					border: "1px solid hsl(var(--border))",
					borderRadius: "8px",
					background: "hsl(var(--card))",
					color: "#f4f4f5",
					padding: "1rem",
				}}
			>
				<Typography className="mb-[0.45rem]" variant="pageTitle">
					{content.heading}
				</Typography>
				<Typography variant="description">{content.description}</Typography>
			</header>
			{sectionKey === "settings" ? (
				<SettingsPanelContent view={settingsView} />
			) : (
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
			)}
		</section>
	);
}
