import type {
	ProjectCronJobDefinition,
	ProjectCronJobTargetType,
	ProjectCronJobValidationError,
	ProjectCronJobValidationResult,
} from "./project-cron-job-definition.types";

const TARGET_TYPES: ReadonlySet<ProjectCronJobTargetType> = new Set([
	"script",
	"hook",
]);

export function validateProjectCronJobDefinition(
	input: unknown,
): ProjectCronJobValidationResult {
	if (!isRecord(input)) {
		return {
			ok: false,
			errors: [{ field: "root", message: "Expected object body" }],
		};
	}

	const errors: ProjectCronJobValidationError[] = [];
	const projectId = stringField(input.projectId, "projectId", errors);
	const cronExpression = stringField(
		input.cronExpression,
		"cronExpression",
		errors,
	);
	const targetType = targetTypeField(input.targetType, errors);
	const target = stringField(input.target, "target", errors);
	const skills = skillsField(input.skills, errors);
	const enabled = booleanField(input.enabled, "enabled", errors);

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		value: {
			projectId,
			cronExpression,
			targetType,
			target,
			skills,
			enabled,
		},
	};
}

export function serializeProjectCronJobSkills(skills: string[]): string {
	return JSON.stringify(skills);
}

export function parseProjectCronJobSkills(
	raw: string,
): string[] | { error: string } {
	try {
		const parsed = JSON.parse(raw);
		if (
			!Array.isArray(parsed) ||
			parsed.some((item) => typeof item !== "string")
		) {
			return { error: "skills must be a JSON string array" };
		}
		return parsed;
	} catch {
		return { error: "skills must be valid JSON" };
	}
}

function stringField(
	value: unknown,
	field: string,
	errors: ProjectCronJobValidationError[],
): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		errors.push({ field, message: `${field} must be a non-empty string` });
		return "";
	}
	return value;
}

function targetTypeField(
	value: unknown,
	errors: ProjectCronJobValidationError[],
): ProjectCronJobTargetType {
	if (value !== "script" && value !== "hook") {
		errors.push({
			field: "targetType",
			message: "targetType must be one of: script, hook",
		});
		return "script";
	}
	if (!TARGET_TYPES.has(value)) {
		errors.push({
			field: "targetType",
			message: "targetType must be one of: script, hook",
		});
		return "script";
	}
	return value;
}

function skillsField(
	value: unknown,
	errors: ProjectCronJobValidationError[],
): string[] {
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
		errors.push({
			field: "skills",
			message: "skills must be an array of strings",
		});
		return [];
	}
	return value;
}

function booleanField(
	value: unknown,
	field: string,
	errors: ProjectCronJobValidationError[],
): boolean | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== "boolean") {
		errors.push({ field, message: `${field} must be a boolean when provided` });
		return undefined;
	}
	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
