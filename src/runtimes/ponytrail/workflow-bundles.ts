import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { z } from "zod";

const workflowFileName = "workflow.json";
const workflowStoreDir = ".ponyrace/workflows";

const WorkflowSkillSchema = z.object({
  source: z.string().min(1),
  optional: z.boolean().optional(),
});

const WorkflowStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  skill: z.string().min(1),
  gate: z.enum(["human_approval"]).optional(),
});

export const WorkflowBundleManifestSchema = z
  .object({
    schemaVersion: z.literal("0.1"),
    name: z.string().min(1),
    version: z.string().min(1),
    description: z.string().min(1),
    skills: z.array(WorkflowSkillSchema).min(1),
    steps: z.array(WorkflowStepSchema).min(1),
  })
  .superRefine((manifest, context) => {
    const stepIds = new Set<string>();
    for (const [index, step] of manifest.steps.entries()) {
      if (stepIds.has(step.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate workflow step id: ${step.id}`,
          path: ["steps", index, "id"],
        });
      }
      stepIds.add(step.id);
    }

    const skillSources = new Set(manifest.skills.map((skill) => skill.source));
    for (const [index, step] of manifest.steps.entries()) {
      if (!skillSources.has(step.skill)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Workflow step ${step.id} references unknown skill: ${step.skill}`,
          path: ["steps", index, "skill"],
        });
      }
    }
  });

export type WorkflowBundleManifest = z.infer<typeof WorkflowBundleManifestSchema>;

export interface WorkflowBundle {
  manifest: WorkflowBundleManifest;
  sourceDir: string;
  manifestPath: string;
  bundled: boolean;
}

export interface WorkflowBundleScaffold {
  bundleDir: string;
  manifestPath: string;
  readmePath: string;
}

export interface InstalledWorkflowBundle extends WorkflowBundleManifest {
  source: {
    kind: "bundled" | "local";
    path: string;
  };
}

export interface WorkflowInstallResult {
  workflow: InstalledWorkflowBundle;
  path: string;
}

export async function loadWorkflowBundle(
  source: string,
  options: { cwd?: string } = {},
): Promise<WorkflowBundle> {
  const sourceDir = resolveWorkflowBundleSource(source, options.cwd ?? process.cwd());
  const manifestPath = sourceDir.endsWith(workflowFileName)
    ? sourceDir
    : join(sourceDir, workflowFileName);
  const manifestDir = sourceDir.endsWith(workflowFileName) ? dirname(sourceDir) : sourceDir;
  const rawManifest = await readFile(manifestPath, "utf8");
  const manifest = WorkflowBundleManifestSchema.parse(JSON.parse(rawManifest));

  return {
    manifest,
    sourceDir: manifestDir,
    manifestPath,
    bundled: isBundledWorkflowSource(source),
  };
}

export async function createWorkflowBundleScaffold(input: {
  rootDir: string;
  name: string;
}): Promise<WorkflowBundleScaffold> {
  const bundleDir = join(input.rootDir, input.name);
  const localSkillDir = join(bundleDir, "skills", "custom-review");
  const manifestPath = join(bundleDir, workflowFileName);
  const readmePath = join(bundleDir, "README.md");

  await mkdir(localSkillDir, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(createScaffoldManifest(input.name), null, 2)}\n`);
  await writeFile(
    readmePath,
    `# ${input.name}\n\nA workflow bundle that composes reusable agent skills.\n`,
  );
  await writeFile(
    join(localSkillDir, "SKILL.md"),
    [
      "---",
      "name: custom-review",
      'description: "Review this workflow from the bundle author perspective."',
      "---",
      "",
      "# Custom Review",
      "",
      "Check whether the workflow output matches the bundle author's stated outcome.",
      "",
    ].join("\n"),
  );

  return { bundleDir, manifestPath, readmePath };
}

export async function installWorkflowBundle(input: {
  rootDir: string;
  bundle: WorkflowBundle;
}): Promise<WorkflowInstallResult> {
  const workflow = createInstalledWorkflowBundle(input.bundle);
  const workflowDir = join(input.rootDir, workflowStoreDir);
  const path = join(workflowDir, `${workflow.name}.json`);

  await mkdir(workflowDir, { recursive: true });
  await writeFile(path, `${JSON.stringify(workflow, null, 2)}\n`);

  return { workflow, path };
}

export async function listInstalledWorkflowBundles(input: {
  rootDir: string;
}): Promise<InstalledWorkflowBundle[]> {
  const workflowDir = join(input.rootDir, workflowStoreDir);
  if (!existsSync(workflowDir)) {
    return [];
  }

  const entries = await readdir(workflowDir, { withFileTypes: true });
  const workflows: InstalledWorkflowBundle[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const raw = await readFile(join(workflowDir, entry.name), "utf8");
    workflows.push(JSON.parse(raw) as InstalledWorkflowBundle);
  }

  return workflows.sort((left, right) => left.name.localeCompare(right.name));
}

export function getWorkflowSkillInstallSources(bundle: WorkflowBundle): string[] {
  return bundle.manifest.skills.map((skill) => {
    if (skill.source.startsWith("./") || skill.source.startsWith("../")) {
      return resolve(bundle.sourceDir, skill.source);
    }
    return skill.source;
  });
}

function createInstalledWorkflowBundle(bundle: WorkflowBundle): InstalledWorkflowBundle {
  return {
    ...bundle.manifest,
    source: {
      kind: bundle.bundled ? "bundled" : "local",
      path: bundle.sourceDir,
    },
  };
}

function createScaffoldManifest(name: string): WorkflowBundleManifest {
  return WorkflowBundleManifestSchema.parse({
    schemaVersion: "0.1",
    name,
    version: "0.1.0",
    description: `Workflow bundle for ${name}.`,
    skills: [
      { source: "superpowers:brainstorming" },
      { source: "./skills/custom-review" },
      { source: "superpowers:writing-plans" },
      { source: "pony-trail" },
    ],
    steps: [
      {
        id: "shape",
        title: "Shape the request",
        skill: "superpowers:brainstorming",
        gate: "human_approval",
      },
      {
        id: "custom-review",
        title: "Run the bundle-specific review",
        skill: "./skills/custom-review",
        gate: "human_approval",
      },
      {
        id: "plan",
        title: "Write the implementation plan",
        skill: "superpowers:writing-plans",
      },
      {
        id: "evidence",
        title: "Record evidence and rollback context",
        skill: "pony-trail",
      },
    ],
  });
}

function resolveWorkflowBundleSource(source: string, cwd: string): string {
  if (isLocalWorkflowSource(source)) {
    return isAbsolute(source) ? source : resolve(cwd, source);
  }

  return join(findBundledWorkflowsDir(), source);
}

function isLocalWorkflowSource(source: string): boolean {
  return (
    source === "." ||
    source === ".." ||
    source.startsWith("./") ||
    source.startsWith("../") ||
    source.startsWith("/") ||
    source.includes("/") ||
    source.endsWith(".json")
  );
}

function isBundledWorkflowSource(source: string): boolean {
  return !isLocalWorkflowSource(source);
}

function findBundledWorkflowsDir(): string {
  const currentDir = dirname(new URL(import.meta.url).pathname);
  const candidates = [
    join(currentDir, "..", "..", "..", "bundled-workflows"),
    join(currentDir, "..", "bundled-workflows"),
    join(process.cwd(), "bundled-workflows"),
  ];

  const found = candidates.find((candidate) =>
    existsSync(join(candidate, "product-dev", workflowFileName)),
  );
  if (!found) {
    throw new Error("Unable to locate bundled workflow files.");
  }

  return found;
}
