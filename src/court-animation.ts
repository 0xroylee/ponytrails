import { spinner } from "@clack/prompts";
import pc from "picocolors";
import type { Manifest } from "./runtimes/ponytrail/manifest";
import type { RequirementCourtRound } from "./runtimes/ponytrail/requirement-court";

const HORSE_ART = [
  "         _",
  "        / \\___",
  "       | o o  |~  PONY COURT IS IN SESSION",
  "        \\ ^ /",
  "    ____|___|____",
  "   /    |   |    \\  All requirements must be",
  "  /     |   |     \\  approved by the herd.",
].join("\n");

// Funny messages that cycle on the spinner while ponies deliberate.
const SPINNER_MESSAGES = [
  "The ponies are debating loudly in the stable...",
  "Someone brought apples — brief snack break...",
  "PM Bot is rewriting the roadmap on a hay bale...",
  "Engineer Bot is refactoring the horseshoe...",
  "Testing Bot is writing edge cases for galloping...",
  "Counting votes by hoof — this may take a moment...",
  "The herd is circling the requirement suspiciously...",
  "Senior Bot is drawing architecture diagrams in the dirt...",
  "A heated debate about sprint velocity has broken out...",
  "Coffee break. Wait — ponies drink oat lattes.",
  "Requirement Judge is sharpening their gavel...",
  "The ponies have requested a second opinion on the oats...",
];

const VOTE_BARS: Record<string, string> = {
  approve: pc.green("████████"),
  needs_changes: pc.yellow("████░░░░"),
  reject: pc.red("██░░░░░░"),
};

const VOTE_LABELS: Record<string, string> = {
  approve: pc.green("✓ approve"),
  needs_changes: pc.yellow("~ needs changes"),
  reject: pc.red("✗ reject"),
};

export interface CourtAnimator {
  startRound(round: number, botIds: string[]): void;
  finishRound(round: RequirementCourtRound): void;
  stop(): void;
}

// Print the ASCII horse banner before court begins.
export function printHorseRaceHeader(): void {
  console.log("");
  console.log(pc.cyan(HORSE_ART));
  console.log("");
}

// Render the race track showing each pony's vote result for the completed rounds.
export function printRaceTrack(rounds: RequirementCourtRound[], manifest: Manifest): void {
  if (rounds.length === 0) return;
  const latestRound = rounds.at(-1);
  if (!latestRound) return;
  const voterIds = manifest.deliberation.decisionRule.voterIds;

  console.log(pc.bold(`  ── Race Track  Round ${latestRound.round} ──`));

  for (const botId of voterIds) {
    const entry = latestRound.discussion.find((d) => d.botId === botId);
    if (!entry) continue;
    const bar = VOTE_BARS[entry.vote] ?? pc.dim("░░░░░░░░");
    const label = VOTE_LABELS[entry.vote] ?? entry.vote;
    const name = (entry.displayName ?? botId).padEnd(24);
    console.log(`  🐴 ${name} ${bar}  ${label}`);
  }

  const verdict = latestRound.verdict.approved
    ? pc.green("  Verdict: approved ✓")
    : pc.yellow(`  Verdict: not yet — ${latestRound.verdict.approvals} approval(s) so far`);
  console.log(verdict);
  console.log("");
}

// Create an animator that wraps court rounds with a spinner and race-track output.
export function createCourtAnimator(manifest: Manifest): CourtAnimator {
  const s = spinner();
  let msgInterval: ReturnType<typeof setInterval> | undefined;
  let msgIndex = 0;
  const completedRounds: RequirementCourtRound[] = [];

  function cycleMessage(): void {
    const msg = SPINNER_MESSAGES[msgIndex % SPINNER_MESSAGES.length];
    if (msg) s.message(msg);
    msgIndex += 1;
  }

  function clearCycle(): void {
    if (msgInterval !== undefined) {
      clearInterval(msgInterval);
      msgInterval = undefined;
    }
  }

  return {
    startRound(round: number, botIds: string[]): void {
      const preview = botIds.slice(0, 3).join(", ");
      const extra = botIds.length > 3 ? ` +${botIds.length - 3} more` : "";
      s.start(`Round ${round}: ${preview}${extra} are saddling up...`);
      msgIndex = 0;
      msgInterval = setInterval(cycleMessage, 700);
    },

    finishRound(round: RequirementCourtRound): void {
      clearCycle();
      const verdict = round.verdict.approved ? pc.green("approved ✓") : pc.yellow("ongoing...");
      s.stop(`Round ${round.round} complete — ${verdict}`);
      completedRounds.push(round);
      printRaceTrack(completedRounds, manifest);
    },

    stop(): void {
      clearCycle();
    },
  };
}
