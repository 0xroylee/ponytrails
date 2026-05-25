import type {
	TaskIntakeDecision,
	TaskIntakeQuestion,
	TaskIntakeQuestionOption,
	TaskIntakeTask,
} from "./types/task-intake.types";

export function parseTaskIntakeDecision(output: string): TaskIntakeDecision {
	const result = parseResult(output);
	if (result === "CLEAR") {
		return { result, task: parseTaskJson(output) };
	}
	return { result, questions: parseQuestionsJson(output) };
}

function parseResult(output: string): "CLEAR" | "NEEDS_INFO" {
	const match = output.match(
		/(?:^|\n)\s*RESULT\s*:\s*(CLEAR|NEEDS_INFO)\s*(?:\n|$)/i,
	);
	if (!match?.[1]) {
		throw new Error(
			"Task intake output must include RESULT: CLEAR|NEEDS_INFO.",
		);
	}
	return match[1].toUpperCase() === "CLEAR" ? "CLEAR" : "NEEDS_INFO";
}

function parseTaskJson(output: string): TaskIntakeTask {
	const jsonText = extractMarkerJson(output, "TASK_JSON", "object");
	if (!jsonText) {
		throw new Error("CLEAR task intake output must include TASK_JSON.");
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText);
	} catch (error) {
		throw new Error(
			`Failed to parse TASK_JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("TASK_JSON must be a JSON object.");
	}
	const record = parsed as Record<string, unknown>;
	const title =
		typeof record.title === "string" ? record.title.trim() : undefined;
	const description =
		typeof record.description === "string"
			? record.description.trim()
			: undefined;
	if (!title) {
		throw new Error("TASK_JSON.title must be a non-empty string.");
	}
	if (!description) {
		throw new Error("TASK_JSON.description must be a non-empty string.");
	}
	return { title, description };
}

function parseQuestionsJson(output: string): TaskIntakeQuestion[] {
	const jsonText = extractMarkerJson(output, "QUESTIONS_JSON", "array");
	if (!jsonText) {
		throw new Error(
			"NEEDS_INFO task intake output must include QUESTIONS_JSON.",
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText);
	} catch (error) {
		throw new Error(
			`Failed to parse QUESTIONS_JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (!Array.isArray(parsed)) {
		throw new Error("QUESTIONS_JSON must be a JSON array.");
	}
	const questions = parsed.map(parseQuestion).filter((item) => item.question);
	if (questions.length === 0) {
		throw new Error("QUESTIONS_JSON must include at least one question.");
	}
	return questions;
}

function parseQuestion(item: unknown, index: number): TaskIntakeQuestion {
	if (typeof item === "string") {
		return { question: item.trim() };
	}
	if (!item || typeof item !== "object" || Array.isArray(item)) {
		throw new Error(`QUESTIONS_JSON item ${index} must be a string or object.`);
	}
	const record = item as Record<string, unknown>;
	if (typeof record.question !== "string" || !record.question.trim()) {
		throw new Error(
			`QUESTIONS_JSON item ${index}.question must be a non-empty string.`,
		);
	}
	const options = parseQuestionOptions(record.options, index);
	return {
		question: record.question.trim(),
		...(options ? { options } : {}),
	};
}

function parseQuestionOptions(
	value: unknown,
	questionIndex: number,
): TaskIntakeQuestionOption[] | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!Array.isArray(value)) {
		throw new Error(
			`QUESTIONS_JSON item ${questionIndex}.options must be an array.`,
		);
	}
	if (value.length < 2 || value.length > 4) {
		throw new Error(
			`QUESTIONS_JSON item ${questionIndex}.options must include two to four options.`,
		);
	}
	return value.map((item, optionIndex) =>
		parseQuestionOption(item, questionIndex, optionIndex),
	);
}

function parseQuestionOption(
	item: unknown,
	questionIndex: number,
	optionIndex: number,
): TaskIntakeQuestionOption {
	if (!item || typeof item !== "object" || Array.isArray(item)) {
		throw new Error(
			`QUESTIONS_JSON item ${questionIndex}.options[${optionIndex}] must be an object.`,
		);
	}
	const record = item as Record<string, unknown>;
	if (typeof record.label !== "string" || !record.label.trim()) {
		throw new Error(
			`QUESTIONS_JSON item ${questionIndex}.options[${optionIndex}].label must be a non-empty string.`,
		);
	}
	if (typeof record.value !== "string" || !record.value.trim()) {
		throw new Error(
			`QUESTIONS_JSON item ${questionIndex}.options[${optionIndex}].value must be a non-empty string.`,
		);
	}
	const description =
		typeof record.description === "string" && record.description.trim()
			? record.description.trim()
			: undefined;
	if ("recommended" in record && typeof record.recommended !== "boolean") {
		throw new Error(
			`QUESTIONS_JSON item ${questionIndex}.options[${optionIndex}].recommended must be a boolean.`,
		);
	}
	return {
		label: record.label.trim(),
		value: record.value.trim(),
		...(description ? { description } : {}),
		...(record.recommended === true ? { recommended: true } : {}),
	};
}

function extractMarkerJson(
	output: string,
	markerName: string,
	shape: "object" | "array",
): string | undefined {
	const marker = new RegExp(`\\b${markerName}\\s*:`, "i");
	const markerMatch = marker.exec(output);
	if (!markerMatch) {
		return undefined;
	}
	const rawPayload = output.slice(markerMatch.index + markerMatch[0].length);
	const source = unwrapFencedCodeBlock(rawPayload.trim());
	return shape === "object"
		? extractFirstBalancedJson(source, "{", "}")
		: extractFirstBalancedJson(source, "[", "]");
}

function unwrapFencedCodeBlock(value: string): string {
	const trimmed = value.trim();
	const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```/i);
	return match?.[1]?.trim() ?? trimmed;
}

function extractFirstBalancedJson(
	value: string,
	open: "{" | "[",
	close: "}" | "]",
): string | undefined {
	const start = value.indexOf(open);
	if (start < 0) {
		return undefined;
	}
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = start; index < value.length; index += 1) {
		const char = value[index];
		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (char === "\\") {
				escaped = true;
				continue;
			}
			if (char === '"' && !escaped) {
				inString = false;
			}
			continue;
		}
		if (char === '"') {
			inString = true;
		} else if (char === open) {
			depth += 1;
		} else if (char === close) {
			depth -= 1;
			if (depth === 0) {
				return value.slice(start, index + 1);
			}
		}
	}
	return undefined;
}
