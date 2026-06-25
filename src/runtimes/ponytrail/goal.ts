import type { Manifest } from "./manifest";

export interface DraftGoalContractInput {
  manifest: Manifest;
}

export interface GoalContract {
  title: string;
  intent: string;
  rawRequest: string;
  scope: {
    include: string[];
    exclude: string[];
  };
  acceptanceCriteria: string[];
  evidenceRequired: string[];
  risks: string[];
  openQuestions: string[];
  approvalRule: Manifest["defaultGoalTemplate"]["approvalRule"];
  status: "draft";
}

export function draftGoalContract(rawRequest: string, input: DraftGoalContractInput): GoalContract {
  const normalizedRequest = normalizeRequest(rawRequest);
  const approvalRule = input.manifest.defaultGoalTemplate.approvalRule;

  return {
    title: normalizedRequest,
    intent: normalizedRequest,
    rawRequest,
    scope: {
      include: [],
      exclude: [],
    },
    acceptanceCriteria: [
      `Human owner confirms the detailed requirement matches this request: ${normalizedRequest}`,
      `Requirement court reaches the configured ${formatApprovalThreshold(
        approvalRule.goalDirectionPanel,
      )} approval threshold.`,
      "Worker execution remains gated until the human confirms the requirement direction.",
    ],
    evidenceRequired: [
      "raw_human_request",
      "requirements_brainstorm",
      "requirement_contract_draft",
      "role_bot_discussion",
      "bot_votes",
      "judge_summary",
      "detailed_requirement",
      "human_decision",
      "locked_goal_contract",
    ],
    risks: ["Goal may need refinement before execution if scope or verification remains unclear."],
    openQuestions: [],
    approvalRule,
    status: "draft",
  };
}

function formatApprovalThreshold(
  panel: Manifest["defaultGoalTemplate"]["approvalRule"]["goalDirectionPanel"],
): string {
  return `${panel.requiredApprovals}-of-${panel.voters.length}`;
}

function normalizeRequest(rawRequest: string): string {
  const normalized = rawRequest.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new Error("Goal request cannot be empty");
  }

  return normalized;
}
