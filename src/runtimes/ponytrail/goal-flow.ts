import {
  type BrainstormAnswer,
  brainstormRequirements,
  buildClarifiedGoalRequest,
  type RequirementsBrainstorm,
} from "./brainstorm";
import { draftGoalContract, type GoalContract } from "./goal";
import type { Manifest } from "./manifest";
import type { RequirementCourtResult } from "./requirement-court";

export type HumanGoalApproval = "pending" | "approved" | "rejected";

export interface StartGoalFlowInput {
  manifest: Manifest;
}

export interface DraftGoalFromBrainstormInput {
  manifest: Manifest;
  answers: BrainstormAnswer[];
}

export interface WritingPlansHandoff {
  nextSkill: "superpowers:writing-plans";
  message: string;
}

export interface GoalBrainstormInputState {
  status: "needs_brainstorm_input";
  rawRequest: string;
  brainstorm: RequirementsBrainstorm;
  contract: null;
  humanGoalApproval: "pending";
}

export interface GoalApprovalPendingState {
  status: "goal_approval_pending";
  rawRequest: string;
  brainstorm: RequirementsBrainstorm;
  contract: GoalContract;
  humanGoalApproval: "pending";
}

export interface GoalRejectedState {
  status: "goal_rejected";
  rawRequest: string;
  brainstorm: RequirementsBrainstorm;
  contract: GoalContract;
  humanGoalApproval: "rejected";
}

export interface GoalReadyForDiscussionState {
  status: "ready_for_discussion";
  rawRequest: string;
  brainstorm: RequirementsBrainstorm;
  contract: GoalContract;
  humanGoalApproval: "approved";
}

export interface GoalReadyForWritingPlansState {
  status: "ready_for_writing_plans";
  rawRequest: string;
  brainstorm: RequirementsBrainstorm;
  contract: GoalContract;
  humanGoalApproval: "approved";
  court: RequirementCourtResult;
  handoff: WritingPlansHandoff;
}

export type GoalFlowState =
  | GoalBrainstormInputState
  | GoalApprovalPendingState
  | GoalRejectedState
  | GoalReadyForDiscussionState
  | GoalReadyForWritingPlansState;

export function startGoalFlow(
  rawRequest: string,
  _input: StartGoalFlowInput,
): GoalBrainstormInputState {
  return {
    status: "needs_brainstorm_input",
    rawRequest,
    brainstorm: brainstormRequirements(rawRequest),
    contract: null,
    humanGoalApproval: "pending",
  };
}

export function draftGoalFromBrainstorm(
  state: GoalBrainstormInputState,
  input: DraftGoalFromBrainstormInput,
): GoalApprovalPendingState {
  const clarified = buildClarifiedGoalRequest(state.rawRequest, state.brainstorm, input.answers);

  return {
    status: "goal_approval_pending",
    rawRequest: state.rawRequest,
    brainstorm: state.brainstorm,
    contract: draftGoalContract(clarified.clarifiedRequest, {
      manifest: input.manifest,
      openQuestions: clarified.openQuestions,
    }),
    humanGoalApproval: "pending",
  };
}

export function approveGoalDraft(state: GoalApprovalPendingState): GoalReadyForDiscussionState {
  return {
    status: "ready_for_discussion",
    rawRequest: state.rawRequest,
    brainstorm: state.brainstorm,
    contract: state.contract,
    humanGoalApproval: "approved",
  };
}

export function rejectGoalDraft(state: GoalApprovalPendingState): GoalRejectedState {
  return {
    status: "goal_rejected",
    rawRequest: state.rawRequest,
    brainstorm: state.brainstorm,
    contract: state.contract,
    humanGoalApproval: "rejected",
  };
}

export function completeGoalDiscussion(
  state: GoalReadyForDiscussionState,
  court: RequirementCourtResult,
): GoalReadyForWritingPlansState {
  return {
    status: "ready_for_writing_plans",
    rawRequest: state.rawRequest,
    brainstorm: state.brainstorm,
    contract: state.contract,
    humanGoalApproval: "approved",
    court,
    handoff: {
      nextSkill: "superpowers:writing-plans",
      message: `Goal "${court.detailedRequirement.title}" is ready for writing-plans.`,
    },
  };
}
