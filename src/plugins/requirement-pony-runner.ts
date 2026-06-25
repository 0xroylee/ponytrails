import { z } from "zod";
import { VoteValueSchema } from "../runtimes/ponytrail/manifest";
import type {
  RequirementPonyResponse,
  RequirementPonyRunInput,
  RequirementPonyRunner,
} from "../runtimes/ponytrail/requirement-court";
import type { CliProcessRunner, WorkerCliAdapter } from "./adapters/types";

export interface CliRequirementPonyRunnerOptions {
  adapter: WorkerCliAdapter;
  runner: CliProcessRunner;
}

const CliRequirementPonyResponseSchema = z.object({
  message: z.string().min(1),
  visibleThinking: z.object({
    focus: z.string().min(1),
    concern: z.string().min(1),
    recommendation: z.string().min(1),
  }),
  vote: VoteValueSchema,
  confidence: z.number().min(0).max(1),
  requiredChanges: z.array(z.string().min(1)),
});

export function createCliRequirementPonyRunner(
  options: CliRequirementPonyRunnerOptions,
): RequirementPonyRunner {
  return async (input) => {
    const result = await options.adapter.runGoal(buildRequirementPonyPrompt(input), options.runner);

    if (result.exitCode !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || "no output";
      throw new Error(
        `Requirement pony ${input.bot.id} failed through ${options.adapter.id}: ${detail}`,
      );
    }

    return parseRequirementPonyResponse(result.stdout);
  };
}

function buildRequirementPonyPrompt(input: RequirementPonyRunInput): string {
  const approvalConditions = formatList(input.bot.approvalConditions ?? []);
  const rejectOrAmendConditions = formatList(input.bot.rejectOrAmendConditions ?? []);
  const priorDiscussion =
    input.priorDiscussion.length === 0
      ? "none"
      : input.priorDiscussion
          .map((entry) => `- Round ${entry.round} ${entry.botId} (${entry.vote}): ${entry.message}`)
          .join("\n");

  return [
    "Requirement pony review",
    `Pony: ${input.bot.displayName} (${input.bot.id})`,
    `Model: ${input.model.name} (${input.model.id})`,
    `Round: ${input.round} of ${input.manifest.deliberation.maxRounds}`,
    `Instruction: ${input.bot.instruction}`,
    `Approval conditions:\n${approvalConditions}`,
    `Reject or amend conditions:\n${rejectOrAmendConditions}`,
    "Requirement:",
    `Title: ${input.contract.title}`,
    `Intent: ${input.contract.intent}`,
    `Include: ${formatInlineList(input.contract.scope.include)}`,
    `Exclude: ${formatInlineList(input.contract.scope.exclude)}`,
    `Acceptance criteria: ${formatInlineList(input.contract.acceptanceCriteria)}`,
    `Evidence required: ${formatInlineList(input.contract.evidenceRequired)}`,
    `Risks: ${formatInlineList(input.contract.risks)}`,
    `Open questions: ${formatInlineList(input.contract.openQuestions)}`,
    `Prior discussion:\n${priorDiscussion}`,
    "Do not reveal private chain-of-thought. Summarize only visible rationale.",
    'Return only JSON: {"message": string, "visibleThinking": {"focus": string, "concern": string, "recommendation": string}, "vote": "approve" | "amend" | "reject", "confidence": number, "requiredChanges": string[]}',
  ].join("\n");
}

function parseRequirementPonyResponse(rawOutput: string): RequirementPonyResponse {
  const jsonText = extractJsonObject(rawOutput);
  const parsed = CliRequirementPonyResponseSchema.parse(JSON.parse(jsonText));

  return {
    message: parsed.message,
    visibleThinking: parsed.visibleThinking,
    vote: parsed.vote,
    confidence: parsed.confidence,
    requiredChanges: parsed.requiredChanges,
  };
}

function extractJsonObject(rawOutput: string): string {
  const trimmed = rawOutput.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Requirement pony did not return a JSON object.");
  }

  return trimmed.slice(start, end + 1);
}

function formatList(values: string[]): string {
  if (values.length === 0) {
    return "- none";
  }

  return values.map((value) => `- ${value}`).join("\n");
}

function formatInlineList(values: string[]): string {
  return values.length > 0 ? values.join("; ") : "none";
}
