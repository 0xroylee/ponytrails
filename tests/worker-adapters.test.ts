import { describe, expect, test } from "bun:test";
import { createCliRequirementPonyRunner } from "../src/plugins";
import {
  cliWorkerAdapters,
  getCliWorkerAdapter,
  getCliWorkerAdapterForCommand,
} from "../src/plugins/adapters";
import {
  buildClaudeGoalCommand,
  runClaudeGoal,
  streamClaudeGoal,
} from "../src/plugins/adapters/claude-cli";
import {
  buildCodexGoalCommand,
  runCodexGoal,
  streamCodexGoal,
} from "../src/plugins/adapters/codex-cli";
import {
  buildGithubCopilotGoalCommand,
  runGithubCopilotGoal,
  streamGithubCopilotGoal,
} from "../src/plugins/adapters/github-copilot-cli";
import type {
  CliInvocation,
  CliProcessRunner,
  CliStreamEvent,
  CliStreamRunner,
} from "../src/plugins/adapters/types";
import { draftGoalContract } from "../src/runtimes/ponytrail/goal";
import { createDefaultManifest } from "../src/runtimes/ponytrail/manifest";

describe("worker CLI adapters", () => {
  test("registers Codex, Claude, and GitHub Copilot CLI adapters", () => {
    expect(cliWorkerAdapters.map((adapter) => adapter.id)).toEqual([
      "codex-cli",
      "claude-cli",
      "github-copilot-cli",
    ]);
  });

  test("builds goal invocations for conversational CLIs", () => {
    expect(buildCodexGoalCommand("Add CSV import")).toEqual({
      executable: "codex",
      args: ["exec", "--skip-git-repo-check", "Goal: Add CSV import"],
    });

    expect(buildClaudeGoalCommand("Add CSV import")).toEqual({
      executable: "claude",
      args: [],
      stdin: '/goal "Add CSV import"',
    });
  });

  test("builds a prompt argument invocation for GitHub Copilot CLI", () => {
    expect(buildGithubCopilotGoalCommand("Add CSV import")).toEqual({
      executable: "gh",
      args: ["copilot", "suggest", "Goal: Add CSV import"],
    });
  });

  test("runs adapter commands through an injected process runner", async () => {
    const calls: CliInvocation[] = [];
    const runner: CliProcessRunner = async (invocation) => {
      calls.push(invocation);
      return {
        invocation,
        exitCode: 0,
        stdout: "accepted",
        stderr: "",
      };
    };

    await runCodexGoal("Add CSV import", runner);
    await runClaudeGoal("Review tests", runner);
    await runGithubCopilotGoal("Suggest implementation", runner);

    expect(calls).toEqual([
      {
        executable: "codex",
        args: ["exec", "--skip-git-repo-check", "Goal: Add CSV import"],
      },
      {
        executable: "claude",
        args: [],
        stdin: '/goal "Review tests"',
      },
      {
        executable: "gh",
        args: ["copilot", "suggest", "Goal: Suggest implementation"],
      },
    ]);
  });

  test("registry adapters can run goals through the same runner seam", async () => {
    const runner: CliProcessRunner = async (invocation) => ({
      invocation,
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    });

    const result = await getCliWorkerAdapter("codex-cli").runGoal("Add CSV import", runner);

    expect(result).toEqual({
      invocation: {
        executable: "codex",
        args: ["exec", "--skip-git-repo-check", "Goal: Add CSV import"],
      },
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    });
  });

  test("resolves registry adapters from manifest worker commands", () => {
    expect(getCliWorkerAdapterForCommand("codex").id).toBe("codex-cli");
    expect(getCliWorkerAdapterForCommand("claude").id).toBe("claude-cli");
    expect(getCliWorkerAdapterForCommand("gh copilot suggest").id).toBe("github-copilot-cli");
  });

  test("registry adapters can stream goals through an injected stream runner", async () => {
    const streamRunner: CliStreamRunner = async function* (invocation) {
      yield { type: "start", invocation };
      yield { type: "stdout", chunk: "working" };
      yield { type: "stderr", chunk: "warning" };
      yield { type: "exit", exitCode: 0 };
    };

    const events: CliStreamEvent[] = [];
    for await (const event of getCliWorkerAdapter("claude-cli").streamGoal(
      "Review CSV import",
      streamRunner,
    )) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: "start",
        invocation: {
          executable: "claude",
          args: [],
          stdin: '/goal "Review CSV import"',
        },
      },
      { type: "stdout", chunk: "working" },
      { type: "stderr", chunk: "warning" },
      { type: "exit", exitCode: 0 },
    ]);
  });

  test("adapter helpers can stream goals through the same stream runner", async () => {
    const streamRunner: CliStreamRunner = async function* (invocation) {
      yield { type: "start", invocation };
      yield { type: "exit", exitCode: 0 };
    };

    const events: CliStreamEvent[] = [];
    for await (const event of streamCodexGoal("Add CSV import", streamRunner)) {
      events.push(event);
    }
    for await (const event of streamClaudeGoal("Review CSV import", streamRunner)) {
      events.push(event);
    }
    for await (const event of streamGithubCopilotGoal("Suggest CSV import", streamRunner)) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: "start",
        invocation: {
          executable: "codex",
          args: ["exec", "--skip-git-repo-check", "Goal: Add CSV import"],
        },
      },
      { type: "exit", exitCode: 0 },
      {
        type: "start",
        invocation: {
          executable: "claude",
          args: [],
          stdin: '/goal "Review CSV import"',
        },
      },
      { type: "exit", exitCode: 0 },
      {
        type: "start",
        invocation: {
          executable: "gh",
          args: ["copilot", "suggest", "Goal: Suggest CSV import"],
        },
      },
      { type: "exit", exitCode: 0 },
    ]);
  });

  test("creates a CLI-backed pony runner that prompts one sub-agent and parses its vote", async () => {
    const manifest = createDefaultManifest();
    const contract = draftGoalContract("Add CSV import to admin dashboard", { manifest });
    const bot = manifest.bots.find((candidate) => candidate.id === "engineer_bot");
    const model = manifest.models.find((candidate) => candidate.id === bot?.model);
    const invocations: CliInvocation[] = [];
    const runner: CliProcessRunner = async (invocation) => {
      invocations.push(invocation);
      return {
        invocation,
        exitCode: 0,
        stdout: JSON.stringify({
          message: "Engineering approves with a smoke test.",
          visibleThinking: {
            focus: "Check implementation and verification shape.",
            concern: "The plan needs a smoke test before approval.",
            recommendation: "Approve with a focused CLI smoke check.",
          },
          vote: "approve",
          confidence: 0.92,
          requiredChanges: [],
        }),
        stderr: "",
      };
    };

    if (!bot || !model) {
      throw new Error("Default manifest is missing the engineer bot or model.");
    }

    const ponyRunner = createCliRequirementPonyRunner({
      adapter: getCliWorkerAdapter("codex-cli"),
      runner,
    });

    const response = await ponyRunner({
      manifest,
      bot,
      model,
      contract,
      round: 1,
      priorDiscussion: [],
    });

    expect(response).toEqual({
      message: "Engineering approves with a smoke test.",
      visibleThinking: {
        focus: "Check implementation and verification shape.",
        concern: "The plan needs a smoke test before approval.",
        recommendation: "Approve with a focused CLI smoke check.",
      },
      vote: "approve",
      confidence: 0.92,
      requiredChanges: [],
    });
    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.args.join(" ")).toContain("Requirement pony review");
    expect(invocations[0]?.args.join(" ")).toContain("Pony: Engineer Bot (engineer_bot)");
    expect(invocations[0]?.args.join(" ")).toContain("visibleThinking");
    expect(invocations[0]?.args.join(" ")).toContain("Return only JSON");
  });
});
