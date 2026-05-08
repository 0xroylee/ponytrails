import { createHash } from "node:crypto";
import {
	appendFile,
	mkdir,
	readFile,
	readdir,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { AgentChatLogEntry, RunState, WorkflowStage } from "./types";

const LEGACY_STATE_DIR = path.join(".piv-loop", "runs");
const STATE_ROOT_DIR = path.join(".piv-loop", "projects");
const CHAT_LOGS_DIR = "chat-logs";
export const AGENT_CHAT_LOG_RETENTION = 1000;

export function normalizeIssueKey(input: string): string {
	const match = input.trim().match(/[A-Z]+-\d+/);
	if (!match) {
		return input.trim().toUpperCase();
	}
	return match[0].toUpperCase();
}

export function stateFilePath(
	cwd: string,
	projectId: string,
	issueKey: string,
): string {
	return path.join(
		cwd,
		STATE_ROOT_DIR,
		projectId,
		"runs",
		`${normalizeIssueKey(issueKey)}.json`,
	);
}

export function projectErrorLogPath(cwd: string, projectId: string): string {
	return path.join(cwd, STATE_ROOT_DIR, projectId, "errors.log");
}

export interface ProjectErrorLogEntryInput {
	cycle: number;
	message: string;
	error: Record<string, unknown>;
	context?: Record<string, unknown>;
	recordedAt?: string;
}

export async function appendProjectErrorLog(
	cwd: string,
	projectId: string,
	entry: ProjectErrorLogEntryInput,
): Promise<void> {
	const file = projectErrorLogPath(cwd, projectId);
	await mkdir(path.dirname(file), { recursive: true });
	const payload = {
		recordedAt: entry.recordedAt ?? new Date().toISOString(),
		projectId,
		cycle: entry.cycle,
		message: entry.message,
		error: entry.error,
		...(entry.context ? { context: entry.context } : {}),
	};
	await appendFile(file, `${JSON.stringify(payload)}\n`, "utf8");
}

export async function loadRunState(
	cwd: string,
	projectId: string,
	issueKey: string,
): Promise<RunState | null> {
	const file = stateFilePath(cwd, projectId, issueKey);
	try {
		const raw = await readFile(file, "utf8");
		return JSON.parse(raw) as RunState;
	} catch {
		if (projectId !== "default") {
			return null;
		}
		const legacy = path.join(
			cwd,
			LEGACY_STATE_DIR,
			`${normalizeIssueKey(issueKey)}.json`,
		);
		try {
			const raw = await readFile(legacy, "utf8");
			return JSON.parse(raw) as RunState;
		} catch {
			return null;
		}
	}
}

export async function saveRunState(
	cwd: string,
	state: RunState,
): Promise<void> {
	const file = stateFilePath(cwd, state.projectId, state.issue.key);
	await mkdir(path.dirname(file), { recursive: true });
	state.updatedAt = new Date().toISOString();
	await writeFile(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function listRunStates(
	cwd: string,
	projectId: string,
): Promise<RunState[]> {
	const dir = path.join(cwd, STATE_ROOT_DIR, projectId, "runs");
	try {
		const files = await readdir(dir);
		const runs: RunState[] = [];
		for (const file of files) {
			if (!file.endsWith(".json")) {
				continue;
			}
			const raw = await readFile(path.join(dir, file), "utf8");
			runs.push(JSON.parse(raw) as RunState);
		}
		return runs;
	} catch {
		return [];
	}
}

export function transitionStage(
	state: RunState,
	next: WorkflowStage,
): RunState {
	return {
		...state,
		stage: next,
		updatedAt: new Date().toISOString(),
	};
}

export function applyRunLease(
	state: RunState,
	ownerId: string,
	leaseTimeoutMs: number,
	nowMs = Date.now(),
): RunState {
	const nowIso = new Date(nowMs).toISOString();
	return {
		...state,
		lease: {
			ownerId,
			acquiredAt:
				state.lease?.ownerId === ownerId ? state.lease.acquiredAt : nowIso,
			heartbeatAt: nowIso,
			expiresAt: new Date(nowMs + leaseTimeoutMs).toISOString(),
		},
		updatedAt: nowIso,
	};
}

export function clearRunLease(state: RunState): RunState {
	return {
		...state,
		lease: undefined,
		updatedAt: new Date().toISOString(),
	};
}

export function isRunLeaseExpired(
	state: RunState,
	nowMs = Date.now(),
): boolean {
	if (!state.lease?.expiresAt) {
		return true;
	}
	const expiresAtMs = Date.parse(state.lease.expiresAt);
	if (Number.isNaN(expiresAtMs)) {
		return true;
	}
	return nowMs >= expiresAtMs;
}

export function hasRunLeaseConflict(
	state: RunState,
	ownerId: string,
	nowMs = Date.now(),
): boolean {
	if (!state.lease?.ownerId) {
		return false;
	}
	if (state.lease.ownerId === ownerId) {
		return false;
	}
	return !isRunLeaseExpired(state, nowMs);
}

function sanitizePathToken(value: string): string {
	const cleaned = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return cleaned || "default";
}

function skillPathHash(skillPath: string): string {
	return createHash("sha1").update(skillPath).digest("hex").slice(0, 8);
}

function agentSkillLogFileName(skillPath: string): string {
	const normalized = sanitizePathToken(skillPath.replace(/[\\/]+/g, "-"));
	return `${normalized}-${skillPathHash(skillPath)}.json`;
}

export function agentChatLogPath(
	cwd: string,
	projectId: string,
	agentRole: AgentChatLogEntry["agentRole"],
	skillPath: string,
): string {
	return path.join(
		cwd,
		STATE_ROOT_DIR,
		projectId,
		CHAT_LOGS_DIR,
		sanitizePathToken(agentRole),
		agentSkillLogFileName(skillPath),
	);
}

export async function appendAgentChatLog(
	cwd: string,
	projectId: string,
	entry: AgentChatLogEntry,
	retention = AGENT_CHAT_LOG_RETENTION,
): Promise<void> {
	const file = agentChatLogPath(
		cwd,
		projectId,
		entry.agentRole,
		entry.skillPath,
	);
	await mkdir(path.dirname(file), { recursive: true });

	let existing: AgentChatLogEntry[] = [];
	try {
		const raw = await readFile(file, "utf8");
		const parsed = JSON.parse(raw) as unknown;
		if (Array.isArray(parsed)) {
			existing = parsed as AgentChatLogEntry[];
		}
	} catch {}

	existing.push(entry);
	const keep = Math.max(1, retention);
	const trimmed = existing.slice(-keep);
	await writeFile(file, `${JSON.stringify(trimmed, null, 2)}\n`, "utf8");
}
