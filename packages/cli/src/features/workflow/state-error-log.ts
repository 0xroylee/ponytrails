import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const STATE_ROOT_DIR = path.join(".devos", "projects");

export interface ProjectErrorLogEntryInput {
	cycle: number;
	message: string;
	error: Record<string, unknown>;
	context?: Record<string, unknown>;
	recordedAt?: string;
}

export function projectErrorLogPath(cwd: string, projectId: string): string {
	return path.join(cwd, STATE_ROOT_DIR, projectId, "errors.log");
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
