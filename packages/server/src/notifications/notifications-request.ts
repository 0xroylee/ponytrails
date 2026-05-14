import type { RunState } from "devos/features/types";
import { z } from "zod";
import { isRecord } from "../http/zod-utils";
import type { NotificationRequest } from "./notifications.types";

const runStateSchema = z
	.object({
		projectId: z.string(),
		projectName: z.string(),
		updatedAt: z.string(),
		issue: z.object({
			key: z.string(),
			title: z.string(),
			url: z.string(),
		}),
	})
	.passthrough();
const taskOutcomeSchema = z.object({
	type: z.literal("task_outcome"),
	state: runStateSchema,
	outcome: z.enum(["done", "blocked"]),
	errorMessage: z.string().optional(),
});
const humanReviewSchema = z.object({
	type: z.literal("human_review_required"),
	state: runStateSchema,
	complexityScore: z.number().finite(),
	reason: z.string().trim().min(1),
});

export async function parseNotificationRequest(
	request: Request,
): Promise<
	| { status: "ok"; request: NotificationRequest }
	| { status: "error"; error: string }
> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return { status: "error", error: "Malformed JSON body" };
	}

	if (!isRecord(body)) {
		return {
			status: "error",
			error: "Malformed notification request: expected object body",
		};
	}
	if (body.type === "task_outcome") {
		return parseTaskOutcome(body);
	}
	if (body.type === "human_review_required") {
		return parseHumanReview(body);
	}
	return {
		status: "error",
		error: "Malformed notification request: unsupported type",
	};
}

function parseTaskOutcome(
	body: Record<string, unknown>,
):
	| { status: "ok"; request: NotificationRequest }
	| { status: "error"; error: string } {
	const parsed = taskOutcomeSchema.safeParse(body);
	if (!parsed.success && !isRunState(body.state)) {
		return {
			status: "error",
			error: "Malformed notification request: state is required",
		};
	}
	if (
		!parsed.success &&
		body.outcome !== "done" &&
		body.outcome !== "blocked"
	) {
		return {
			status: "error",
			error: "Malformed notification request: invalid outcome",
		};
	}
	if (
		!parsed.success &&
		body.errorMessage !== undefined &&
		typeof body.errorMessage !== "string"
	) {
		return {
			status: "error",
			error: "Malformed notification request: errorMessage must be a string",
		};
	}
	if (!parsed.success) {
		return {
			status: "error",
			error: "Malformed notification request: state is required",
		};
	}
	return {
		status: "ok",
		request: {
			type: "task_outcome",
			state: parsed.data.state as unknown as RunState,
			outcome: parsed.data.outcome,
			errorMessage: parsed.data.errorMessage,
		},
	};
}

function parseHumanReview(
	body: Record<string, unknown>,
):
	| { status: "ok"; request: NotificationRequest }
	| { status: "error"; error: string } {
	const parsed = humanReviewSchema.safeParse(body);
	if (!parsed.success && !isRunState(body.state)) {
		return {
			status: "error",
			error: "Malformed notification request: state is required",
		};
	}
	if (
		!parsed.success &&
		(typeof body.complexityScore !== "number" ||
			!Number.isFinite(body.complexityScore))
	) {
		return {
			status: "error",
			error: "Malformed notification request: complexityScore must be a number",
		};
	}
	if (
		!parsed.success &&
		(typeof body.reason !== "string" || body.reason.trim().length === 0)
	) {
		return {
			status: "error",
			error:
				"Malformed notification request: reason must be a non-empty string",
		};
	}
	if (!parsed.success) {
		return {
			status: "error",
			error: "Malformed notification request: state is required",
		};
	}
	return {
		status: "ok",
		request: {
			type: "human_review_required",
			state: parsed.data.state as unknown as RunState,
			complexityScore: parsed.data.complexityScore,
			reason: parsed.data.reason,
		},
	};
}

function isRunState(value: unknown): value is RunState {
	if (!isRecord(value)) {
		return false;
	}
	const issue = value.issue;
	return (
		typeof value.projectId === "string" &&
		typeof value.projectName === "string" &&
		typeof value.updatedAt === "string" &&
		isRecord(issue) &&
		typeof issue.key === "string" &&
		typeof issue.title === "string" &&
		typeof issue.url === "string"
	);
}
