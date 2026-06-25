import pc from "picocolors";
import type { Manifest } from "./runtimes/ponytrail/manifest";
import type {
  RequirementCourtRound,
  RequirementDiscussionEntry,
} from "./runtimes/ponytrail/requirement-court";

// ─── Header ────────────────────────────────────────────────────────────────

// Side-profile pony facing left, styled after the ponytrail logo.
const HEADER_ART = [
  "        ,---.",
  "      _/  o  \\~",
  "     /   ---  |",
  "    (    ___) /",
  "     '-------'",
  "     /|     |\\",
  "    ( |     | )",
  "     \\|_____|/",
  "      |     |",
  "     / \\   / \\",
];

export function printHorseRaceHeader(): void {
  console.log("");
  for (const line of HEADER_ART) {
    process.stdout.write(`  ${pc.yellow(line)}\n`);
  }
  console.log("");
  console.log(pc.bold(`  ${pc.cyan("🐴  PONY COURT IS IN SESSION  🐴")}`));
  console.log(pc.dim("  ════════════════════════════════════"));
  console.log(pc.dim("  All ponies must vote before implementation begins."));
  console.log("");
}

// ─── Gallop frames ─────────────────────────────────────────────────────────

// 5-line body common to all frames.
const BODY = ["     ,---. ", "   _/  o  \\~", "  /   ---  |", "  \\-------'"];

// Three leg positions for the gallop cycle.
const LEG_FRAMES = [
  ["  /\\    /\\ ", " /  \\  /  \\"],
  ["   |    |  ", "   |    |  "],
  ["  /\\  /\\  ", " /    \\/   "],
];

// Total lines drawn per animation frame (body + legs + label).
const FRAME_H = BODY.length + 2 + 1;

// Funny per-role thoughts shown while the pony deliberates.
const THOUGHTS: Record<string, string[]> = {
  product_manager_bot: [
    "is rewriting the roadmap on a hay bale...",
    "is aligning pony OKRs with the requirement...",
    "is questioning the user story over oats...",
  ],
  project_manager_bot: [
    "is updating the sprint board with a hoof...",
    "is calculating story points in horseshoes...",
    "is moving the ticket to 'In Deliberation'...",
  ],
  engineer_bot: [
    "is refactoring the horseshoe...",
    "is Googling 'how to implement in one sprint'...",
    "is checking if it breaks the stable CI...",
  ],
  senior_engineer_bot: [
    "is drawing system diagrams in the dirt...",
    "is raising concerns about technical debt...",
    "is insisting on a proper architecture review...",
  ],
  testing_bot: [
    "is writing edge cases for galloping...",
    "is asking 'but what if the carrot is null?'...",
    "is demanding a smoke test before approval...",
  ],
};

const DEFAULT_THOUGHTS = [
  "is deliberating very seriously...",
  "is consulting the hay oracle...",
  "is pondering the requirement...",
];

function thoughtsFor(botId: string): string[] {
  return THOUGHTS[botId] ?? DEFAULT_THOUGHTS;
}

// ─── ANSI helpers ──────────────────────────────────────────────────────────

const UP = (n: number) => `\x1b[${n}A`;
const CLEAR = "\x1b[2K";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function drawFrame(frameIdx: number, label: string): void {
  const legs = LEG_FRAMES[frameIdx % LEG_FRAMES.length] ?? LEG_FRAMES[0] ?? [];
  const lines = [...BODY, ...legs, label];
  for (const line of lines) {
    process.stdout.write(`${CLEAR}  ${pc.yellow(line)}\n`);
  }
  // Move cursor back to top of animation area so next frame overwrites cleanly.
  process.stdout.write(UP(FRAME_H));
}

function clearAnimArea(resultLine: string): void {
  // Cursor is at the TOP of the animation area after the last drawFrame call.
  process.stdout.write(`${CLEAR}  ${resultLine}\n`);
  for (let i = 1; i < FRAME_H; i++) {
    process.stdout.write(`${CLEAR}\n`);
  }
  // Sit right after the result line (not inside the now-blank area).
  process.stdout.write(UP(FRAME_H - 1));
}

// ─── Race track ────────────────────────────────────────────────────────────

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

export function printRaceTrack(rounds: RequirementCourtRound[], manifest: Manifest): void {
  if (rounds.length === 0) return;
  const latest = rounds.at(-1);
  if (!latest) return;

  console.log(pc.bold(`  ── Race Track  Round ${latest.round} ──`));
  for (const botId of manifest.deliberation.decisionRule.voterIds) {
    const entry = latest.discussion.find((d) => d.botId === botId);
    if (!entry) continue;
    const bar = VOTE_BARS[entry.vote] ?? pc.dim("░░░░░░░░");
    const label = VOTE_LABELS[entry.vote] ?? entry.vote;
    console.log(`  🐴 ${(entry.displayName ?? botId).padEnd(26)}${bar}  ${label}`);
  }
  const verdict = latest.verdict.approved
    ? pc.green("  Verdict: approved ✓")
    : pc.yellow(`  Verdict: not yet — ${latest.verdict.approvals} approval(s) so far`);
  console.log(verdict);
  console.log("");
}

// ─── Animator ──────────────────────────────────────────────────────────────

export interface CourtAnimatorOptions {
  /** Minimum ms to show each pony's animation before revealing the result. Default 1800. */
  minPonyMs?: number;
  /** Frame interval in ms for the gallop animation. Default 170. */
  frameMs?: number;
}

export interface CourtAnimator {
  onRoundStart(round: number, botIds: string[]): Promise<void>;
  onRoundComplete(round: RequirementCourtRound): Promise<void>;
  onPonyStart(botId: string, displayName: string, round: number): Promise<void>;
  onPonyComplete(entry: RequirementDiscussionEntry): Promise<void>;
  stop(): void;
}

export function createCourtAnimator(
  manifest: Manifest,
  options?: CourtAnimatorOptions,
): CourtAnimator {
  const minPonyMs = options?.minPonyMs ?? 1800;
  const frameMs = options?.frameMs ?? 170;
  const completedRounds: RequirementCourtRound[] = [];
  let gallopInterval: ReturnType<typeof setInterval> | undefined;
  let ponyStartTime = 0;
  let frameIndex = 0;
  let currentBotId = "";
  let currentDisplayName = "";

  function clearGallop(): void {
    if (gallopInterval !== undefined) {
      clearInterval(gallopInterval);
      gallopInterval = undefined;
    }
  }

  return {
    async onRoundStart(round: number, botIds: string[]): Promise<void> {
      console.log(
        pc.bold(pc.cyan(`\n  🏁 Round ${round} — ${botIds.length} ponies enter the court\n`)),
      );
    },

    async onPonyStart(botId: string, displayName: string): Promise<void> {
      currentBotId = botId;
      currentDisplayName = displayName;
      ponyStartTime = Date.now();
      frameIndex = 0;

      // Reserve animation space then return cursor to the top of it.
      process.stdout.write("\n".repeat(FRAME_H));
      process.stdout.write(UP(FRAME_H));

      const thoughts = thoughtsFor(botId);
      const label = `  🐴 ${displayName} ${thoughts[0]}`;
      drawFrame(0, label);

      gallopInterval = setInterval(() => {
        frameIndex++;
        const thought = thoughts[frameIndex % thoughts.length] ?? thoughts[0] ?? "";
        drawFrame(frameIndex, `  🐴 ${currentDisplayName} ${thought}`);
      }, frameMs);
    },

    async onPonyComplete(entry: RequirementDiscussionEntry): Promise<void> {
      // Always show animation for at least minPonyMs so it's visible.
      const elapsed = Date.now() - ponyStartTime;
      if (elapsed < minPonyMs) await sleep(minPonyMs - elapsed);

      clearGallop();

      const bar = VOTE_BARS[entry.vote] ?? pc.dim("░░░░░░░░");
      const voteLabel = VOTE_LABELS[entry.vote] ?? entry.vote;
      const name = pc.bold((entry.displayName ?? currentBotId).padEnd(26));
      clearAnimArea(`${name}${bar}  ${voteLabel}`);
    },

    async onRoundComplete(round: RequirementCourtRound): Promise<void> {
      completedRounds.push(round);
      console.log("");
      printRaceTrack(completedRounds, manifest);
    },

    stop(): void {
      clearGallop();
    },
  };
}
