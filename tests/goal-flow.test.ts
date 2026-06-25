import { describe, expect, test } from "bun:test";
import {
  approveGoalDraft,
  completeGoalDiscussion,
  draftGoalFromBrainstorm,
  rejectGoalDraft,
  startGoalFlow,
} from "../src/runtimes/ponytrail/goal-flow";
import { createDefaultManifest } from "../src/runtimes/ponytrail/manifest";
import type { RequirementCourtResult } from "../src/runtimes/ponytrail/requirement-court";

describe("runtime goal flow", () => {
  test("starts with brainstorm input when adaptive questions are missing", () => {
    const state = startGoalFlow("make it better", { manifest: createDefaultManifest() });

    expect(state.status).toBe("needs_brainstorm_input");
    expect(state.contract).toBeNull();
    expect(state.humanGoalApproval).toBe("pending");
    expect(state.brainstorm.questions.map((question) => question.id)).toEqual([
      "outcome",
      "scope",
      "evidence",
    ]);
  });

  test("drafts a goal from brainstorm answers and waits for approval", () => {
    const started = startGoalFlow("make it better", { manifest: createDefaultManifest() });
    const pending = draftGoalFromBrainstorm(started, {
      manifest: createDefaultManifest(),
      answers: [
        {
          question: "What specific outcome should the worker agent produce?",
          mode: "custom",
          answer: "Create an admin dashboard CSV importer.",
        },
        {
          question: "Which files, product area, or workflow should be in scope?",
          mode: "open_question",
          answer: "",
        },
        {
          question: "What evidence would prove the work is complete?",
          mode: "custom",
          answer: "Show passing tests.",
        },
      ],
    });

    expect(pending.status).toBe("goal_approval_pending");
    expect(pending.humanGoalApproval).toBe("pending");
    expect(pending.contract.title).toContain("Create an admin dashboard CSV importer");
    expect(pending.contract.openQuestions).toEqual([
      "Which files, product area, or workflow should be in scope?",
    ]);
  });

  test("requires approval before discussion and records rejection", () => {
    const started = startGoalFlow(
      "Add CSV import to admin dashboard with tests and smoke evidence",
      {
        manifest: createDefaultManifest(),
      },
    );
    const pending = draftGoalFromBrainstorm(started, {
      manifest: createDefaultManifest(),
      answers: [],
    });

    expect(approveGoalDraft(pending).status).toBe("ready_for_discussion");
    expect(rejectGoalDraft(pending)).toMatchObject({
      status: "goal_rejected",
      humanGoalApproval: "rejected",
    });
  });

  test("marks approved court results ready for writing plans", () => {
    const started = startGoalFlow(
      "Add CSV import to admin dashboard with tests and smoke evidence",
      {
        manifest: createDefaultManifest(),
      },
    );
    const approved = approveGoalDraft(
      draftGoalFromBrainstorm(started, {
        manifest: createDefaultManifest(),
        answers: [],
      }),
    );
    const court = {
      detailedRequirement: {
        title: approved.contract.title,
      },
    } as RequirementCourtResult;

    const ready = completeGoalDiscussion(approved, court);

    expect(ready.status).toBe("ready_for_writing_plans");
    expect(ready.handoff.nextSkill).toBe("superpowers:writing-plans");
    expect(ready.handoff.message).toContain("ready for writing-plans");
  });
});
