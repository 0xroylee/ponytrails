import { describe, expect, test } from "bun:test";
import {
  brainstormRequirements,
  buildClarifiedGoalRequest,
  prepareGoalDiscussion,
} from "../src/runtimes/ponytrail/brainstorm";
import { createDefaultManifest } from "../src/runtimes/ponytrail/manifest";

describe("goal brainstorm stage", () => {
  test("asks outcome, scope, and evidence questions for vague requests", () => {
    const result = brainstormRequirements("make it better");

    expect(result.status).toBe("needs_brainstorm_input");
    expect(result.questions).toEqual([
      {
        id: "outcome",
        prompt: "What specific outcome should the worker agent produce?",
      },
      {
        id: "scope",
        prompt: "Which files, product area, or workflow should be in scope?",
      },
      {
        id: "evidence",
        prompt: "What evidence would prove the work is complete?",
      },
    ]);
  });

  test("asks only missing adaptive questions for detailed requests", () => {
    const result = brainstormRequirements(
      "Add CSV import to the admin dashboard with row validation errors",
    );

    expect(result.status).toBe("needs_brainstorm_input");
    expect(result.normalizedRequest).toBe(
      "Add CSV import to the admin dashboard with row validation errors",
    );
    expect(result.questions).toEqual([
      {
        id: "evidence",
        prompt: "What evidence would prove the work is complete?",
      },
    ]);
  });

  test("marks fully detailed requests ready for goal drafting", () => {
    const result = brainstormRequirements(
      "Add CSV import to the admin dashboard with tests and a smoke check",
    );

    expect(result.status).toBe("ready_for_goal_draft");
    expect(result.questions).toEqual([]);
  });

  test("merges custom answers and preserves open questions", () => {
    const brainstorm = brainstormRequirements("make it better");
    const result = buildClarifiedGoalRequest("make it better", brainstorm, [
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
        answer: "Show passing tests and a successful import smoke result.",
      },
    ]);

    expect(result.clarifiedRequest).toBe(
      [
        "make it better",
        "What specific outcome should the worker agent produce? Create an admin dashboard CSV importer.",
        "What evidence would prove the work is complete? Show passing tests and a successful import smoke result.",
      ].join(" "),
    );
    expect(result.openQuestions).toEqual([
      "Which files, product area, or workflow should be in scope?",
    ]);
  });

  test("prepares a goal contract from a fully detailed request", () => {
    const result = prepareGoalDiscussion(
      "Add CSV import to admin dashboard with tests and smoke evidence",
      {
        manifest: createDefaultManifest(),
      },
    );

    expect(result.status).toBe("ready_for_discussion");
    expect(result.contract?.title).toBe(
      "Add CSV import to admin dashboard with tests and smoke evidence",
    );
    expect(result.contract?.evidenceRequired).toContain("requirements_brainstorm");
  });

  test("keeps legacy requirement discussion compatible for clear requests", () => {
    const result = prepareGoalDiscussion("Add CSV import to admin dashboard", {
      manifest: createDefaultManifest(),
    });

    expect(result.status).toBe("ready_for_discussion");
    expect(result.contract?.title).toBe("Add CSV import to admin dashboard");
  });
});
