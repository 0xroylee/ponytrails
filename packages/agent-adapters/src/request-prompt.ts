import type { AgentAdapterRunRequest } from "./types/agent-adapter.types";

export function renderAgentPrompt(request: AgentAdapterRunRequest): string {
	const sections = [
		renderAgentInstructions(request),
		renderCustomInstructions(request),
		renderSkills(request),
		request.prompt,
	].filter((section) => section.trim());
	return sections.length === 1 ? request.prompt : sections.join("\n\n");
}

function renderAgentInstructions(request: AgentAdapterRunRequest): string {
	const instructions = request.agent?.instructions?.trim();
	if (!instructions) {
		return "";
	}
	return ["Agent instructions:", instructions].join("\n");
}

function renderCustomInstructions(request: AgentAdapterRunRequest): string {
	const instructions = request.customInstructions?.trim();
	if (!instructions) {
		return "";
	}
	return ["Custom instructions:", instructions].join("\n");
}

function renderSkills(request: AgentAdapterRunRequest): string {
	const skills = request.skills ?? [];
	if (skills.length === 0) {
		return "";
	}
	return [
		"Use these skills:",
		...skills.map((skill, index) => {
			const label = skill.name ?? skill.path ?? `skill-${index + 1}`;
			const details = [
				`${index + 1}. ${label}`,
				skill.source ? `source: ${skill.source}` : "",
				skill.path ? `path: ${skill.path}` : "",
				skill.content?.trim() ? `content:\n${skill.content.trim()}` : "",
			].filter(Boolean);
			return details.join("\n");
		}),
	].join("\n");
}
