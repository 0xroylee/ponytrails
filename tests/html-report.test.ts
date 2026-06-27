import { describe, expect, test } from "bun:test";
import { draftGoalContract } from "../src/runtimes/ponytrail/goal";
import { renderRequirementCourtHtml } from "../src/runtimes/ponytrail/html-report";
import { createDefaultManifest } from "../src/runtimes/ponytrail/manifest";
import type { RequirementCourtResult } from "../src/runtimes/ponytrail/requirement-court";

describe("requirement court HTML approval report", () => {
  test("renders the approval-focused review sections", () => {
    const result = createCourtResult();

    const html = renderRequirementCourtHtml(result);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Approve: Add CSV import to admin dashboard</title>");
    expect(html).toContain("Should I approve this?");
    expect(html).toContain("What exactly changes?");
    expect(html).toContain("How will we know it worked?");
    expect(html).toContain("What did the review bots say?");
    expect(html).toContain("What happens next?");
    expect(html).toContain("Will change");
    expect(html).toContain("Add CSV import to admin dashboard");
    expect(html).toContain("Will not change");
    expect(html).toContain("Do not add billing import");
    expect(html).toContain("Acceptance criteria");
    expect(html).toContain("CSV import is covered by tests");
    expect(html).toContain("Evidence required");
    expect(html).toContain("rtk bun test tests/csv-import.test.ts");
    expect(html).toContain("Product Manager Bot");
    expect(html).toContain("approve");
    expect(html).toContain("80%");
    expect(html).toContain("local deterministic pony");
    expect(html).toContain("brainstorm");
    expect(html).toContain("human approval");
    expect(html).toContain("implementation");
    expect(html).toContain("verification");
  });

  test("escapes user and model text before inserting it into HTML", () => {
    const result = createCourtResult({
      title: 'Render <script>alert("x")</script> approval',
      intent: "Keep <img src=x onerror=alert(1)> inert",
      include: ["Add CSV import & validation"],
      exclude: ["Do not render <b>raw HTML</b>"],
      risks: ["Risk <b>scope creep</b> & regressions"],
      openQuestions: ["Should <button>approve</button> stay text?"],
      botMessage: "Concern uses <svg onload=alert(1)>",
    });

    const html = renderRequirementCourtHtml(result);

    expect(html).toContain("Render &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; approval");
    expect(html).toContain("Keep &lt;img src=x onerror=alert(1)&gt; inert");
    expect(html).toContain("Add CSV import &amp; validation");
    expect(html).toContain("Do not render &lt;b&gt;raw HTML&lt;/b&gt;");
    expect(html).toContain("Risk &lt;b&gt;scope creep&lt;/b&gt; &amp; regressions");
    expect(html).toContain("Should &lt;button&gt;approve&lt;/button&gt; stay text?");
    expect(html).toContain("Concern uses &lt;svg onload=alert(1)&gt;");
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<svg onload");
    expect(html).not.toContain("<button>approve</button>");
  });
});

function createCourtResult(
  overrides: {
    title?: string;
    intent?: string;
    include?: string[];
    exclude?: string[];
    risks?: string[];
    openQuestions?: string[];
    botMessage?: string;
  } = {},
): RequirementCourtResult {
  const manifest = createDefaultManifest();
  const title = overrides.title ?? "Add CSV import to admin dashboard";
  const intent = overrides.intent ?? "Add CSV import to admin dashboard";
  const draft = draftGoalContract(title, { manifest });
  const entry = {
    botId: "product_manager_bot",
    displayName: "Product Manager Bot",
    role: "Product",
    round: 1,
    message: overrides.botMessage ?? "This matches the admin import workflow.",
    visibleThinking: {
      focus: "Intent alignment",
      concern: overrides.botMessage ?? "Keep the upload scope narrow.",
      recommendation: "Approve with focused CSV evidence.",
    },
    run: { mode: "local" as const },
    line: "product_manager_bot: I think this is ready.",
    vote: "approve" as const,
    confidence: 0.8,
    evidence: ["Skill-guided evidence"],
    requiredChanges: ["Keep billing import out of scope"],
  };
  const vote = {
    botId: "product_manager_bot",
    vote: "approve" as const,
    confidence: 0.8,
    reason: "Matches intent.",
    requiredChanges: [],
  };
  const verdict = {
    approved: true,
    approvals: 4,
    amendments: 0,
    rejections: 0,
    requiredChanges: [],
    missingVoters: [],
  };

  return {
    rawRequest: title,
    clarifiedRequest: intent,
    draft,
    rounds: [{ round: 1, discussion: [entry], votes: [vote], verdict }],
    discussion: [entry],
    votes: [vote],
    verdict,
    judge: {
      botId: "requirement_judge_bot",
      summary: "Approvals: 4/4. Ready for owner approval.",
      verdict: "approved",
    },
    detailedRequirement: {
      title,
      intent,
      include: overrides.include ?? ["Add CSV import to admin dashboard"],
      exclude: overrides.exclude ?? ["Do not add billing import"],
      acceptanceCriteria: ["CSV import is covered by tests"],
      evidenceRequired: ["rtk bun test tests/csv-import.test.ts"],
      risks: overrides.risks ?? ["Import parsing may reject valid edge cases."],
      openQuestions: overrides.openQuestions ?? [],
    },
    humanConfirmation: "pending",
  };
}
