import type {
	AgentAdapterRunRequest,
	AgentAdapterRuntimeConfig,
	CodexReasoningEffort,
} from "../../../types/agent-adapter.types";
import { normalizeList, toTomlStringArray } from "../utils/config";

export function buildCodexConfigOverrides(
	config: AgentAdapterRuntimeConfig,
	request: AgentAdapterRunRequest,
	reasoningEffortOverride?: CodexReasoningEffort,
	fastModeEnabled?: boolean,
): string[] {
	const overrides: string[] = [];
	const plugins = normalizeList(config.codex.plugins);
	const skillsets = unique([
		...normalizeList(config.codex.skillsets),
		...normalizeList(request.skillsets),
	]);
	const mcpServers = config.codex.mcpServers ?? [];

	for (const plugin of plugins) {
		const pluginKey = JSON.stringify(plugin);
		overrides.push(`plugins.${pluginKey}.enabled=true`);
	}
	if (skillsets.length > 0) {
		overrides.push(`skillsets=${toTomlStringArray(skillsets)}`);
	}
	if (reasoningEffortOverride) {
		overrides.push(
			`model_reasoning_effort=${JSON.stringify(reasoningEffortOverride)}`,
		);
	}
	if (fastModeEnabled) {
		overrides.push('service_tier="fast"');
		overrides.push("features.fast_mode=true");
	}
	appendMcpServers(overrides, mcpServers);
	appendRawOverrides(overrides, config.codex.configOverrides);
	return overrides;
}

function appendMcpServers(
	overrides: string[],
	mcpServers: AgentAdapterRuntimeConfig["codex"]["mcpServers"],
): void {
	for (const server of mcpServers ?? []) {
		const serverKey = JSON.stringify(server.name);
		overrides.push(
			`mcp_servers.${serverKey}.command=${JSON.stringify(server.command)}`,
		);
		overrides.push(
			`mcp_servers.${serverKey}.args=${toTomlStringArray(server.args)}`,
		);
		overrides.push(`mcp_servers.${serverKey}.type="stdio"`);
		for (const [envKey, envValue] of Object.entries(server.env ?? {})) {
			overrides.push(
				`mcp_servers.${serverKey}.env.${envKey}=${JSON.stringify(envValue)}`,
			);
		}
	}
}

function appendRawOverrides(
	overrides: string[],
	rawOverrides: Record<string, string> | undefined,
): void {
	for (const [rawKey, rawValue] of Object.entries(rawOverrides ?? {})) {
		const key = rawKey.trim();
		const value = rawValue.trim();
		if (key && value) {
			overrides.push(`${key}=${value}`);
		}
	}
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}
