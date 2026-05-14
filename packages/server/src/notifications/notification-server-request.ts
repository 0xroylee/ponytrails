import type { NotificationServerRequest } from "devos/features/server";
import { z } from "zod";
import { isRecord } from "../http/zod-utils";

const emailPayloadSchema = z.object({
	from: z.string(),
	to: z.array(z.string()),
	subject: z.string(),
	text: z.string(),
});
const taskOutcomeSchema = z.object({
	type: z.literal("task-outcome"),
	payload: emailPayloadSchema,
});
const humanReviewSchema = z.object({
	type: z.literal("human-review-required"),
	payload: emailPayloadSchema,
	complexityScore: z.number(),
	reason: z.string().trim().min(1),
});

export async function parseNotificationServerRequest(
	request: Request,
): Promise<
	| { status: "ok"; request: NotificationServerRequest }
	| { status: "error"; error: string }
> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return { status: "error", error: "Malformed JSON body" };
	}
	return parseNotificationServerBody(body);
}

export function parseNotificationServerBody(
	body: unknown,
):
	| { status: "ok"; request: NotificationServerRequest }
	| { status: "error"; error: string } {
	if (!isRecord(body)) {
		return {
			status: "error",
			error: "Malformed notification request: expected object body",
		};
	}
	if (body.type !== "task-outcome" && body.type !== "human-review-required") {
		return {
			status: "error",
			error:
				"Malformed notification request: type must be 'task-outcome' or 'human-review-required'",
		};
	}
	if (!emailPayloadSchema.safeParse(body.payload).success) {
		return {
			status: "error",
			error:
				"Malformed notification request: payload must include from, to, subject, and text",
		};
	}
	const result =
		body.type === "task-outcome"
			? taskOutcomeSchema.safeParse(body)
			: humanReviewSchema.safeParse(body);
	if (!result.success && typeof body.complexityScore !== "number") {
		return {
			status: "error",
			error: "Malformed notification request: complexityScore must be a number",
		};
	}
	if (
		!result.success &&
		(typeof body.reason !== "string" || body.reason.trim().length === 0)
	) {
		return {
			status: "error",
			error:
				"Malformed notification request: reason must be a non-empty string",
		};
	}
	if (!result.success) {
		return {
			status: "error",
			error: "Malformed notification request: expected object body",
		};
	}
	return { status: "ok", request: result.data as NotificationServerRequest };
}
