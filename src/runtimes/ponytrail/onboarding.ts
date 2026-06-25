import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type CompactSetupManifest,
  createDefaultManifest,
  type Manifest,
  writeManifest,
} from "./manifest";

export interface CreateOnboardingFilesInput {
  rootDir: string;
  projectName: string;
  manifest?: Manifest | CompactSetupManifest;
}

export interface CreateOnboardingFilesResult {
  courtDir: string;
  manifestPath: string;
  created: string[];
}

export async function createOnboardingFiles(
  input: CreateOnboardingFilesInput,
): Promise<CreateOnboardingFilesResult> {
  const courtDir = join(input.rootDir, ".ponytrail");
  const goalsDir = join(courtDir, "goals");
  const pluginsDir = join(courtDir, "plugins");
  const skillsDir = join(courtDir, "skills");
  const runtimesDir = join(courtDir, "runtimes");
  const manifestPath = join(courtDir, "manifest.json");
  const readmePath = join(courtDir, "README.md");
  const gitkeepPath = join(goalsDir, ".gitkeep");

  await Promise.all([
    mkdir(goalsDir, { recursive: true }),
    mkdir(pluginsDir, { recursive: true }),
    mkdir(skillsDir, { recursive: true }),
    mkdir(runtimesDir, { recursive: true }),
  ]);
  await writeManifest(
    manifestPath,
    input.manifest ?? createDefaultManifest({ name: input.projectName }),
  );
  await writeFile(readmePath, createReadme(input.projectName));
  await writeFile(gitkeepPath, "");

  return {
    courtDir,
    manifestPath,
    created: [manifestPath, readmePath, goalsDir, pluginsDir, skillsDir, runtimesDir, gitkeepPath],
  };
}

function createReadme(projectName: string): string {
  return `# ${projectName} Ponytrail

This directory stores requirement-first runtime files for AI agent work.

## Flow

1. Discuss a requirement with \`ponytrail ponyrace "<request>"\`.
2. Let the configured review bots discuss the direction and vote with the manifest approval rule.
3. Lock the goal only after the manifest approval rule passes and the human owner approves.
4. Start Codex, Claude, or another worker agent with the locked goal contract.
5. Use \`/amend-goal\` when execution discovers the goal must change.

Generated files under \`.ponytrail/goals\` should be treated as an append-only evidence trail.

## Local Extension Folders

- \`.ponytrail/runtimes\`: runtime-specific configuration and policies.
- \`.ponytrail/plugins\`: adapters for workers, evidence sources, and integrations.
- \`.ponytrail/skills\`: reusable judge or drafting capabilities.
`;
}
