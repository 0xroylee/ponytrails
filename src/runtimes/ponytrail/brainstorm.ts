import { draftGoalContract, type GoalContract } from "./goal";
import type { Manifest } from "./manifest";

export type BrainstormStatus = "needs_brainstorm_input" | "ready_for_goal_draft";
export type BrainstormQuestionId = "outcome" | "scope" | "evidence";
export type BrainstormAnswerMode = "custom" | "open_question" | "skip";

export interface BrainstormQuestion {
  id: BrainstormQuestionId;
  prompt: string;
}

export interface BrainstormAnswer {
  question: string;
  mode: BrainstormAnswerMode;
  answer: string;
}

export interface RequirementsBrainstorm {
  status: BrainstormStatus;
  normalizedRequest: string;
  questions: BrainstormQuestion[];
}

export interface ClarifiedGoalRequest {
  rawRequest: string;
  normalizedRequest: string;
  clarifiedRequest: string;
  openQuestions: string[];
  answers: BrainstormAnswer[];
}

export interface PrepareGoalDiscussionInput {
  manifest: Manifest;
}

export type PreparedGoalDiscussion =
  | {
      status: "needs_brainstorm_input";
      brainstorm: RequirementsBrainstorm;
      contract: null;
    }
  | {
      status: "ready_for_discussion";
      brainstorm: RequirementsBrainstorm;
      contract: GoalContract;
    };

interface QuestionRule extends BrainstormQuestion {
  isMissing(normalizedRequest: string): boolean;
}

const QUESTION_RULES: QuestionRule[] = [
  {
    id: "outcome",
    prompt: "What specific outcome should the worker agent produce?",
    isMissing: (request) => isUnclearRequest(request),
  },
  {
    id: "scope",
    prompt: "Which files, product area, or workflow should be in scope?",
    isMissing: (request) =>
      isUnclearRequest(request) ||
      !/\b(src|test|tests|docs|cli|runtime|dashboard|workflow|file|files|module|component|command|admin|api|ui)\b/i.test(
        request,
      ),
  },
  {
    id: "evidence",
    prompt: "What evidence would prove the work is complete?",
    isMissing: (request) =>
      !/\b(test|tests|coverage|smoke|verify|verification|evidence|check|checks|passing|screenshot)\b/i.test(
        request,
      ),
  },
];

const VAGUE_REQUEST_PATTERNS = [
  /\bmake it better\b/i,
  /\bimprove this\b/i,
  /\bfix it\b/i,
  /\bdo this\b/i,
  /\bmake changes\b/i,
  /\bupdate stuff\b/i,
];

export function brainstormRequirements(rawRequest: string): RequirementsBrainstorm {
  const normalizedRequest = normalizeRequest(rawRequest);
  const questions = QUESTION_RULES.filter((rule) => rule.isMissing(normalizedRequest)).map(
    ({ id, prompt }) => ({ id, prompt }),
  );

  return {
    status: questions.length > 0 ? "needs_brainstorm_input" : "ready_for_goal_draft",
    normalizedRequest,
    questions,
  };
}

export function buildClarifiedGoalRequest(
  rawRequest: string,
  brainstorm: RequirementsBrainstorm,
  answers: BrainstormAnswer[],
): ClarifiedGoalRequest {
  const normalizedRequest = normalizeRequest(rawRequest);
  const customAnswers = answers
    .filter((answer) => answer.mode === "custom" && answer.answer.trim())
    .map((answer) => `${answer.question} ${answer.answer.trim()}`);
  const openQuestions = answers
    .filter((answer) => answer.mode === "open_question")
    .map((answer) => answer.question);

  return {
    rawRequest,
    normalizedRequest,
    clarifiedRequest: [brainstorm.normalizedRequest, ...customAnswers].join(" "),
    openQuestions,
    answers,
  };
}

export function prepareGoalDiscussion(
  rawRequest: string,
  input: PrepareGoalDiscussionInput,
): PreparedGoalDiscussion {
  const brainstorm = brainstormRequirements(rawRequest);

  if (isUnclearRequest(brainstorm.normalizedRequest)) {
    return {
      status: "needs_brainstorm_input",
      brainstorm,
      contract: null,
    };
  }

  return {
    status: "ready_for_discussion",
    brainstorm,
    contract: draftGoalContract(brainstorm.normalizedRequest, input),
  };
}

function isUnclearRequest(normalizedRequest: string): boolean {
  const words = normalizedRequest.split(" ").filter(Boolean);

  if (words.length < 5) {
    return true;
  }

  return VAGUE_REQUEST_PATTERNS.some((pattern) => pattern.test(normalizedRequest));
}

function normalizeRequest(rawRequest: string): string {
  const normalized = rawRequest.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new Error("Requirement request cannot be empty");
  }

  return normalized;
}
