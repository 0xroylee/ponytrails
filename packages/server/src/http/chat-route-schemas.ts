import { z } from "zod";
import { parseObjectJsonBody } from "./http-utils";

const answerSchema = z.object({
	question: z.string().trim().min(1),
	answer: z.string().trim().min(1),
});

const clarificationOptionSchema = z
	.object({
		label: z.string().trim().min(1),
		value: z.string().trim().min(1),
		description: z.string().trim().min(1).optional(),
		recommended: z.boolean().optional(),
	})
	.transform(({ recommended, ...option }) => ({
		...option,
		...(recommended === true ? { recommended } : {}),
	}));

const clarificationQuestionSchema = z.union([
	z
		.string()
		.trim()
		.min(1)
		.transform((question) => ({ question })),
	z.object({
		question: z.string().trim().min(1),
		options: z.array(clarificationOptionSchema).min(2).max(4).optional(),
	}),
]);

export const sessionCreateSchema = z.object({
	workspaceId: z.string().trim().min(1).optional(),
	projectId: z.string().trim().min(1).nullable().optional(),
	title: z.string().trim().min(1).optional(),
});

export const sessionUpdateSchema = z.object({
	archived: z.boolean().optional(),
	projectId: z.string().trim().min(1).nullable().optional(),
	title: z.string().trim().min(1).optional(),
	pendingRequest: z.string().nullable().optional(),
	pendingQuestions: z.array(clarificationQuestionSchema).nullable().optional(),
});

export const messageCreateSchema = z.object({
	role: z.enum(["user", "assistant", "system"]),
	kind: z
		.enum(["message", "clarification", "task", "command", "error"])
		.optional(),
	content: z.string().trim().min(1),
	taskId: z.string().trim().min(1).nullable().optional(),
	commandAction: z.string().trim().min(1).nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const sendMessageSchema = z.object({
	content: z.string().trim().min(1),
	answers: z.array(answerSchema).optional(),
});

export async function parseChatBody<T extends z.ZodTypeAny>(
	request: Request,
	schema: T,
): Promise<{ ok: true; value: z.infer<T> } | { ok: false; error: string }> {
	const body = await parseObjectJsonBody(request);
	if (!body.ok) {
		return body;
	}
	const parsed = schema.safeParse(body.value);
	return parsed.success
		? { ok: true, value: parsed.data }
		: { ok: false, error: "Invalid chat payload" };
}
