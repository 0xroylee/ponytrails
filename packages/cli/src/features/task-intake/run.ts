import path from "node:path";
import type { AgentAdapter } from "adapters";
import type { ResolvedProjectConfig } from "../types";
import { parseTaskIntakeDecision } from "./parser";
import { buildTaskIntakePrompt } from "./prompts";
import type {
	RunTaskIntakeOptions,
	TaskIntakeAnswer,
	TaskIntakeResolveResult,
	TaskIntakeRunResult,
	TaskIntakeTaskCreator,
} from "./types/task-intake.types";

const DEFAULT_MAX_CLARIFICATION_ROUNDS = 5;

export async function runTaskIntake(
	config: ResolvedProjectConfig,
	agent: Pick<AgentAdapter, "runAgent" | "runTaskIntake">,
	taskCreator: TaskIntakeTaskCreator,
	options: RunTaskIntakeOptions,
): Promise<TaskIntakeRunResult> {
	const result = await resolveTaskIntake(config, agent, options);
	if (result.status === "needs_info") {
		return result;
	}
	const task = await taskCreator.createTask(result.task);
	return { status: "created", task };
}

export async function resolveTaskIntake(
	config: ResolvedProjectConfig,
	agent: Pick<AgentAdapter, "runAgent" | "runTaskIntake">,
	options: RunTaskIntakeOptions,
): Promise<TaskIntakeResolveResult> {
	const request = options.request.trim();
	if (!request) {
		throw new Error("task create requires a non-empty request");
	}
	const maxClarificationRounds =
		options.maxClarificationRounds ?? DEFAULT_MAX_CLARIFICATION_ROUNDS;
	const suppliedAnswers: TaskIntakeAnswer[] = [
		...(options.initialAnswers ?? []),
		...(options.providedAnswers ?? []),
	];
	const answers: TaskIntakeAnswer[] = [...suppliedAnswers];
	const providedAnswers = new Map(
		suppliedAnswers.map(({ question, answer }) => [question, answer]),
	);
	const allowInteractiveQuestions =
		options.allowInteractiveQuestions ?? !options.nonInteractive;
	let clarificationRounds = 0;

	while (true) {
		const prompt = await buildTaskIntakePrompt(
			resolveCreateTaskSkillPath(config),
			request,
			answers,
		);
		const result = agent.runAgent
			? await agent.runAgent({
					role: "task-intake",
					prompt,
					skills: [
						{ name: "task-intake", path: resolveCreateTaskSkillPath(config) },
					],
				})
			: await agent.runTaskIntake(prompt);
		const decision = parseTaskIntakeDecision(
			result.finalMessage || result.stdout,
		);
		if (decision.result === "CLEAR") {
			return { status: "ready", task: decision.task };
		}
		if (clarificationRounds >= maxClarificationRounds) {
			return { status: "needs_info", questions: decision.questions };
		}
		clarificationRounds += 1;
		for (const question of decision.questions) {
			const providedAnswer = providedAnswers.get(question.question);
			if (providedAnswer) {
				answers.push({
					question: question.question,
					answer: providedAnswer,
				});
				continue;
			}
			if (!allowInteractiveQuestions) {
				return { status: "needs_info", questions: decision.questions };
			}
			answers.push({
				question: question.question,
				answer: await options.askQuestion(question.question),
			});
		}
	}
}

function resolveCreateTaskSkillPath(config: ResolvedProjectConfig): string {
	return (
		config.skills.createTask ??
		path.resolve(config.skills.root, "adhd-explore", "SKILL.md")
	);
}
