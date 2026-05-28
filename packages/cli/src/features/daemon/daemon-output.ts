import {
	renderCliHeading,
	renderCliRule,
	renderKeyValueRows,
} from "../../utils/terminal-format";
import { renderDevosBanner } from "../onboard/banner";

export function renderProductionDaemonStartup(input: {
	cliDaemonUrl: string;
	serverBaseUrl: string;
	webUrl: string;
	workflowUrl: string;
}): string {
	return [
		renderCliHeading("Starting devos server..."),
		"",
		renderDevosBanner(),
		renderCliRule(),
		renderKeyValueRows([
			["Mode", "production daemon", "server | web | workflow poller"],
			["Deploy", "local_trusted", "private"],
			["Bind", "loopback", "127.0.0.1"],
			["Server API", input.serverBaseUrl],
			["UI", input.webUrl],
			["CLI daemon", input.cliDaemonUrl],
			["Workflow", input.workflowUrl],
			["Polling", "forever", "all projects"],
		]),
		renderCliRule(),
		"",
	].join("\n");
}

export function renderCliOnlyDaemonStartup(input: {
	cliDaemonUrl: string;
	pollerAttached: boolean;
}): string {
	return [
		renderCliHeading("Starting devos CLI daemon..."),
		"",
		renderKeyValueRows([
			["Mode", "cli-only"],
			["Bind", "loopback", "127.0.0.1"],
			["CLI daemon", input.cliDaemonUrl],
			[
				"Poller",
				input.pollerAttached ? "attached" : "standby",
				input.pollerAttached ? "forever, all projects" : undefined,
			],
		]),
		"",
	].join("\n");
}

export function renderDaemonReadyMessage(): string {
	return `${renderCliHeading("All ready")}\n`;
}
