import { describe, expect, test } from "bun:test";
import { draftGoalContract } from "../src/runtimes/ponytrail/goal";
import {
  createDefaultManifest,
  createDefaultSetupReviewBots,
  createSetupManifest,
} from "../src/runtimes/ponytrail/manifest";
import { runRequirementCourt } from "../src/runtimes/ponytrail/requirement-court";

describe("requirement court", () => {
  test("creates visible role-bot discussion entries before the Judge summary", () => {
    const manifest = createDefaultManifest();
    const contract = draftGoalContract("Add CSV import to admin dashboard", { manifest });

    const result = runRequirementCourt(contract, { manifest });

    expect(result.discussion.map((entry) => entry.botId)).toEqual([
      "product_manager_bot",
      "project_manager_bot",
      "engineer_bot",
      "testing_bot",
    ]);
    expect(result.discussion.map((entry) => entry.line)).toEqual([
      expect.stringContaining("product_manager_bot: I think"),
      expect.stringContaining("project_manager_bot: I think"),
      expect.stringContaining("engineer_bot: I think"),
      expect.stringContaining("testing_bot: I think"),
    ]);
    expect(result.verdict.approved).toBe(true);
    expect(result.judge.botId).toBe("requirement_judge_bot");
    expect(result.judge.summary).toContain("Approvals: 4/4");
    expect(result.detailedRequirement.title).toBe("Add CSV import to admin dashboard");
  });

  test("uses the manifest vote rule and does not count the Judge as a voter", () => {
    const manifest = createDefaultManifest();
    const contract = draftGoalContract("Add CSV import to admin dashboard", { manifest });

    const result = runRequirementCourt(contract, { manifest });

    expect(result.votes.map((vote) => vote.botId)).toEqual([
      "product_manager_bot",
      "project_manager_bot",
      "engineer_bot",
      "testing_bot",
    ]);
    expect(result.votes.some((vote) => vote.botId === "requirement_judge_bot")).toBe(false);
  });

  test("creates discussion entries for setup-defined voter bots", () => {
    const manifest = createSetupManifest({
      reviewBots: [
        ...createDefaultSetupReviewBots(),
        {
          id: "security_bot",
          displayName: "Security Bot",
          role: "Security",
          panel: "requirement_court",
          instruction: "Review data, permission, and security risk before voting.",
          modelId: "security_model",
          modelName: "security-review-model",
          votes: true,
        },
      ],
    });
    const contract = draftGoalContract("Add CSV import to admin dashboard", { manifest });

    const result = runRequirementCourt(contract, { manifest });

    expect(result.discussion.map((entry) => entry.botId)).toEqual(
      manifest.deliberation.decisionRule.voterIds,
    );
    expect(result.discussion.map((entry) => entry.line)).toEqual([
      expect.stringContaining("product_manager_bot: I think"),
      expect.stringContaining("project_manager_bot: I think"),
      expect.stringContaining("senior_engineer_bot: I think"),
      expect.stringContaining("testing_bot: I think"),
      expect.stringContaining("security_bot: I think"),
    ]);
    expect(result.judge.summary).toContain("Approvals: 5/5");
  });
});
