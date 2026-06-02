import type { ReactElement } from "react";

import { SettingsGithubPanel } from "./settings-github-panel";
import { SettingsModelsPanel } from "./settings-models-panel";
import { SettingsSectionNav } from "./settings-section-nav";
import type { SettingsView } from "./types/settings-navigation.types";

export function SettingsPanelContent({
	view,
}: {
	view: SettingsView;
}): ReactElement {
	return (
		<div className="grid min-w-0 gap-4 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start">
			<SettingsSectionNav />
			<div className="min-w-0">
				{view === "git" ? <SettingsGithubPanel /> : <SettingsModelsPanel />}
			</div>
		</div>
	);
}
