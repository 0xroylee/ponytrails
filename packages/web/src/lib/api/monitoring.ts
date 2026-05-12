import type {
	AgentRecord,
	JobRecord,
	SkillRecord,
	TokenUsageRecord,
} from "./monitoring.types";

const monitoringRoutePaths = {
	tokenUsage: "/api/token-usage",
	jobs: "/api/jobs",
	agents: "/api/agents",
	skills: "/api/skills",
} as const;

const monitoringApiBaseUrl =
	process.env.NEXT_PUBLIC_MONITORING_API_BASE_URL?.trim() ?? "";

function buildMonitoringUrl(path: string): string {
	if (!monitoringApiBaseUrl) {
		return path;
	}

	return new URL(path, monitoringApiBaseUrl).toString();
}

async function fetchMonitoringData<T>(path: string): Promise<T> {
	const url = buildMonitoringUrl(path);

	const response = await fetch(url, {
		method: "GET",
		headers: {
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Monitoring API request failed (${response.status} ${response.statusText}) for ${url}`,
		);
	}

	return (await response.json()) as T;
}

export function fetchTokenUsage(): Promise<TokenUsageRecord[]> {
	return fetchMonitoringData<TokenUsageRecord[]>(
		monitoringRoutePaths.tokenUsage,
	);
}

export function fetchJobs(): Promise<JobRecord[]> {
	return fetchMonitoringData<JobRecord[]>(monitoringRoutePaths.jobs);
}

export function fetchAgents(): Promise<AgentRecord[]> {
	return fetchMonitoringData<AgentRecord[]>(monitoringRoutePaths.agents);
}

export function fetchSkills(): Promise<SkillRecord[]> {
	return fetchMonitoringData<SkillRecord[]>(monitoringRoutePaths.skills);
}
