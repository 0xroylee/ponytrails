import type {
  RequirementCourtResult,
  RequirementCourtRound,
  RequirementDiscussionEntry,
} from "./requirement-court";
import { formatRequirementPonyRun, getDetailedRequirementChanges } from "./requirement-report";

export function renderRequirementCourtHtml(result: RequirementCourtResult): string {
  const title = result.detailedRequirement.title;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Approve: ${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --panel: #ffffff;
      --ink: #1f2933;
      --muted: #667085;
      --line: #d9dee7;
      --accent: #2563eb;
      --approve: #157347;
      --amend: #9a6700;
      --reject: #b42318;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 48px;
    }
    header, section, article {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    header {
      padding: 28px;
      margin-bottom: 18px;
    }
    section {
      padding: 22px;
      margin-top: 18px;
    }
    article {
      padding: 16px;
    }
    h1, h2, h3 {
      margin: 0;
      line-height: 1.2;
    }
    h1 {
      font-size: 32px;
      letter-spacing: 0;
    }
    h2 { font-size: 22px; }
    h3 { font-size: 17px; }
    p { margin: 10px 0 0; }
    ul {
      margin: 12px 0 0;
      padding-left: 22px;
    }
    li + li { margin-top: 6px; }
    .muted { color: var(--muted); }
    .status-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      padding: 4px 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #f9fafb;
      font-size: 14px;
      color: var(--muted);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .checklist, .timeline {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }
    .check {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfe;
    }
    .check-mark {
      color: var(--approve);
      font-weight: 700;
    }
    .needs-review .check-mark {
      color: var(--amend);
    }
    .round {
      margin-top: 16px;
      padding: 0;
      border: 0;
      background: transparent;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
      margin-top: 12px;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }
    .vote-approve { color: var(--approve); }
    .vote-amend { color: var(--amend); }
    .vote-reject { color: var(--reject); }
    .timeline {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
    .step {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: #fbfcfe;
      min-height: 72px;
    }
    .step strong {
      display: block;
    }
    .list-group {
      margin-top: 14px;
    }
    .list-group h4 {
      margin: 0;
      font-size: 14px;
      color: var(--muted);
      text-transform: uppercase;
    }
    @media (max-width: 760px) {
      main {
        width: min(100% - 20px, 1120px);
        padding-top: 20px;
      }
      h1 { font-size: 26px; }
      .grid, .timeline {
        grid-template-columns: 1fr;
      }
    }
    @media print {
      body { background: #ffffff; }
      main { width: 100%; padding: 0; }
      header, section, article { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="muted">Ponytrail approval packet</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(result.detailedRequirement.intent)}</p>
      <div class="status-row">
        <span class="pill">Human confirmation: ${escapeHtml(result.humanConfirmation)}</span>
        <span class="pill">Review verdict: ${
          result.verdict.approved ? "approved" : "not approved"
        }</span>
        <span class="pill">Approvals: ${result.verdict.approvals}</span>
      </div>
    </header>

    <section>
      <h2>Should I approve this?</h2>
      <p class="muted">Approve only if the scope, evidence, and remaining risks match the intended change.</p>
      ${renderApprovalChecklist(result)}
    </section>

    <section>
      <h2>What exactly changes?</h2>
      <div class="grid">
        ${renderListPanel("Will change", getDetailedRequirementChanges(result.detailedRequirement))}
        ${renderListPanel("Will not change", result.detailedRequirement.exclude)}
      </div>
    </section>

    <section>
      <h2>How will we know it worked?</h2>
      <div class="grid">
        ${renderListPanel("Acceptance criteria", result.detailedRequirement.acceptanceCriteria)}
        ${renderListPanel("Evidence required", result.detailedRequirement.evidenceRequired)}
      </div>
    </section>

    <section>
      <h2>Risks and open questions</h2>
      <div class="grid">
        ${renderListPanel("Risks", result.detailedRequirement.risks)}
        ${renderListPanel("Open questions", result.detailedRequirement.openQuestions)}
      </div>
    </section>

    <section>
      <h2>What did the review bots say?</h2>
      ${result.rounds.map(renderRound).join("\n")}
    </section>

    <section>
      <h2>What happens next?</h2>
      <div class="timeline">
        ${["brainstorm", "plan", "human approval", "implementation", "verification"]
          .map(
            (step, index) =>
              `<div class="step"><strong>${index + 1}. ${step}</strong><span class="muted">${renderTimelineCaption(
                step,
              )}</span></div>`,
          )
          .join("\n")}
      </div>
    </section>
  </main>
</body>
</html>
`;
}

function renderApprovalChecklist(result: RequirementCourtResult): string {
  const checks = [
    {
      label: "Clear intended change",
      met: getDetailedRequirementChanges(result.detailedRequirement).length > 0,
    },
    { label: "Clear exclusions", met: result.detailedRequirement.exclude.length > 0 },
    {
      label: "Acceptance criteria",
      met: result.detailedRequirement.acceptanceCriteria.length > 0,
    },
    { label: "Evidence required", met: result.detailedRequirement.evidenceRequired.length > 0 },
    { label: "Review-bot approval", met: result.verdict.approved },
    {
      label: "Known risks and open questions reviewed",
      met:
        result.detailedRequirement.risks.length > 0 ||
        result.detailedRequirement.openQuestions.length === 0,
    },
  ];

  return `<div class="checklist">${checks.map(renderCheck).join("\n")}</div>`;
}

function renderCheck(check: { label: string; met: boolean }): string {
  const className = check.met ? "check" : "check needs-review";
  const mark = check.met ? "OK" : "REVIEW";

  return `<div class="${className}"><span class="check-mark">${mark}</span><span>${escapeHtml(
    check.label,
  )}</span></div>`;
}

function renderListPanel(title: string, values: string[]): string {
  return `<article>
    <h3>${escapeHtml(title)}</h3>
    ${renderList(values)}
  </article>`;
}

function renderList(values: string[]): string {
  if (values.length === 0) {
    return `<p class="muted">None.</p>`;
  }

  return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function renderRound(round: RequirementCourtRound): string {
  return `<section class="round">
    <h3>Round ${round.round}</h3>
    <div class="cards">
      ${round.discussion.map(renderDiscussionEntry).join("\n")}
    </div>
  </section>`;
}

function renderDiscussionEntry(entry: RequirementDiscussionEntry): string {
  return `<article>
    <div class="card-head">
      <div>
        <h3>${escapeHtml(entry.displayName)}</h3>
        <p class="muted">${escapeHtml(entry.botId)} - ${escapeHtml(entry.role)}</p>
      </div>
      <strong class="vote-${entry.vote}">${escapeHtml(entry.vote)} - ${Math.round(
        entry.confidence * 100,
      )}%</strong>
    </div>
    <p><strong>Focus:</strong> ${escapeHtml(entry.visibleThinking.focus)}</p>
    <p><strong>Concern:</strong> ${escapeHtml(entry.visibleThinking.concern)}</p>
    <p><strong>Recommendation:</strong> ${escapeHtml(entry.visibleThinking.recommendation)}</p>
    <p><strong>Run:</strong> ${escapeHtml(formatRequirementPonyRun(entry.run))}</p>
    ${renderInlineList("Evidence", entry.evidence)}
    ${renderInlineList("Required changes", entry.requiredChanges)}
  </article>`;
}

function renderInlineList(title: string, values: string[]): string {
  return `<div class="list-group">
    <h4>${escapeHtml(title)}</h4>
    ${renderList(values)}
  </div>`;
}

function renderTimelineCaption(step: string): string {
  const captions: Record<string, string> = {
    brainstorm: "Clarify the request and review direction.",
    plan: "Turn the approved design into implementation tasks.",
    "human approval": "Owner confirms the plan before work starts.",
    implementation: "Workers make the approved changes.",
    verification: "Evidence proves the change is ready.",
  };

  return captions[step] ?? "";
}

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(/[&<>"']/gu, (character) => replacements[character] ?? character);
}
