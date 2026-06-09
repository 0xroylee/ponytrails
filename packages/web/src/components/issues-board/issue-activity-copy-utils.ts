import type { TaskActivityRecord } from "@/lib/api";

export function createActivityCopyText(activity: TaskActivityRecord): string {
	const lines = [`${activity.actorId} ${activity.title}`];
	if (activity.status?.trim()) {
		lines.push(`Status: ${activity.status}`);
	}
	const body = activity.body.trim();
	if (body) {
		lines.push("", body);
	}
	const stepLines = activity.steps?.flatMap((step) => {
		const summary = `${step.stepNumber}. ${step.action} [${step.status}]`;
		const detail = step.detail?.trim();
		return detail ? [summary, `   ${detail}`] : [summary];
	});
	if (stepLines?.length) {
		lines.push("", "Steps:", ...stepLines);
	}
	return lines.join("\n");
}
