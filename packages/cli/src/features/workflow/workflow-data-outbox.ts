import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
	WorkflowDataOutboxContext,
	WorkflowDataOutboxDrainResult,
	WorkflowDataOutboxEntry,
} from "./workflow-data-outbox.types";
import type { WorkflowDataAction } from "./workflow-data-protocol";

const STATE_ROOT_DIR = path.join(".devos", "projects");
const OUTBOX_FILE = "server-outbox.ndjson";

export function workflowDataOutboxPath(
	context: WorkflowDataOutboxContext,
): string {
	return path.join(
		context.workspacePath,
		STATE_ROOT_DIR,
		context.projectId,
		OUTBOX_FILE,
	);
}

export async function enqueueWorkflowDataOutboxEntry(
	context: WorkflowDataOutboxContext,
	action: WorkflowDataAction,
	payload: unknown,
	error: unknown,
): Promise<void> {
	const file = workflowDataOutboxPath(context);
	await mkdir(path.dirname(file), { recursive: true });
	const entry: WorkflowDataOutboxEntry = {
		id: crypto.randomUUID(),
		action,
		payload,
		createdAt: new Date().toISOString(),
		attempts: 0,
		lastError: normalizeErrorMessage(error),
	};
	await appendFile(file, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function drainWorkflowDataOutbox(
	context: WorkflowDataOutboxContext,
	send: (action: WorkflowDataAction, payload: unknown) => Promise<unknown>,
): Promise<WorkflowDataOutboxDrainResult> {
	const entries = await readWorkflowDataOutboxEntries(context);
	let attempted = 0;
	let sent = 0;
	const remaining: WorkflowDataOutboxEntry[] = [];

	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		attempted += 1;
		try {
			await send(entry.action, entry.payload);
			sent += 1;
		} catch (error) {
			remaining.push({
				...entry,
				attempts: entry.attempts + 1,
				lastError: normalizeErrorMessage(error),
			});
			remaining.push(...entries.slice(index + 1));
			await writeWorkflowDataOutboxEntries(context, remaining);
			return {
				attempted,
				sent,
				remaining: remaining.length,
				error: normalizeErrorMessage(error),
			};
		}
	}

	await writeWorkflowDataOutboxEntries(context, remaining);
	return { attempted, sent, remaining: 0 };
}

async function readWorkflowDataOutboxEntries(
	context: WorkflowDataOutboxContext,
): Promise<WorkflowDataOutboxEntry[]> {
	try {
		const raw = await readFile(workflowDataOutboxPath(context), "utf8");
		return raw
			.split(/\r?\n/)
			.filter(Boolean)
			.flatMap((line) => {
				try {
					return [JSON.parse(line) as WorkflowDataOutboxEntry];
				} catch {
					return [];
				}
			});
	} catch {
		return [];
	}
}

async function writeWorkflowDataOutboxEntries(
	context: WorkflowDataOutboxContext,
	entries: WorkflowDataOutboxEntry[],
): Promise<void> {
	const file = workflowDataOutboxPath(context);
	await mkdir(path.dirname(file), { recursive: true });
	const body = entries.map((entry) => JSON.stringify(entry)).join("\n");
	await writeFile(file, body ? `${body}\n` : "", "utf8");
}

function normalizeErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
