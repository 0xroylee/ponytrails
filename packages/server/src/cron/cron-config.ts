import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { CronJobConfig } from "./cron.types";

const CONFIG_CANDIDATES = [
	"adhd-ai.local.config.ts",
	"adhd-ai.config.ts",
	"piv-loop.config.ts",
] as const;

type RawCronRoot = {
	automations?: { jobs?: unknown };
	cron?: { jobs?: unknown };
};

export async function loadCronJobsFromConfig(
	cwd: string,
): Promise<CronJobConfig[]> {
	const configPath = await findConfigPath(cwd);
	if (!configPath) {
		return [];
	}

	const moduleUrl = pathToFileURL(configPath).href;
	const loaded = await import(`${moduleUrl}?t=${Date.now()}`);
	const root = (loaded.default ?? loaded) as RawCronRoot;
	const rawJobs = root.automations?.jobs ?? root.cron?.jobs;
	if (!Array.isArray(rawJobs)) {
		return [];
	}
	return rawJobs.flatMap(toCronJobConfig);
}

async function findConfigPath(cwd: string): Promise<string | null> {
	for (const fileName of CONFIG_CANDIDATES) {
		const absolute = path.join(cwd, fileName);
		try {
			await access(absolute);
			return absolute;
		} catch {}
	}
	return null;
}

function toCronJobConfig(value: unknown): CronJobConfig[] {
	if (!value || typeof value !== "object") {
		return [];
	}
	const raw = value as Record<string, unknown>;
	if (typeof raw.id !== "string" || !raw.id.trim()) {
		return [];
	}
	const schedule = raw.schedule;
	if (!schedule || typeof schedule !== "object") {
		return [];
	}
	const run = raw.run;
	if (run !== undefined && (!run || typeof run !== "object")) {
		return [];
	}
	const skills = raw.skills;
	if (skills !== undefined && (!skills || typeof skills !== "object")) {
		return [];
	}

	return [
		{
			id: raw.id,
			name: typeof raw.name === "string" ? raw.name : undefined,
			enabled: typeof raw.enabled === "boolean" ? raw.enabled : undefined,
			schedule: schedule as CronJobConfig["schedule"],
			run: (run ?? {}) as CronJobConfig["run"],
			skills: skills as CronJobConfig["skills"],
		},
	];
}
