import type { AgentAdapter, AgentResult } from "adapters";

export function createPassingAgent(): AgentAdapter {
	const plan = [
		"PLANNING_RESULT: READY",
		"SUCCESS_GOAL: Create an agent handoff from chat.",
		"COMPLEXITY: SIMPLE",
		"COMPLEXITY_SCORE: 3",
		"Use the existing chat-to-workflow path.",
	].join("\n");
	const result = (finalMessage: string, sessionId?: string): AgentResult => ({
		finalMessage,
		stdout: "",
		sessionId,
	});
	return {
		runAgent: async (request) => {
			if (request.sessionId)
				return result("Implemented chat handoff.", "plan-session");
			if (request.role === "review-testing")
				return result(
					"RESULT: PASS\nSUMMARY: clean\nBUGS_JSON: []",
					"review-session",
				);
			if (request.role === "planning") return result(plan, "plan-session");
			return result("");
		},
		runPlan: async () => result(plan, "plan-session"),
		runTaskIntake: async () => result(""),
		resume: async () => result("Implemented chat handoff.", "plan-session"),
		runReview: async () =>
			result("RESULT: PASS\nSUMMARY: clean\nBUGS_JSON: []", "review-session"),
		runGithubComment: async () => result(""),
	};
}
