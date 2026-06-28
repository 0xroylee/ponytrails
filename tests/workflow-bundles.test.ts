import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createWorkflowBundleScaffold,
  installWorkflowBundle,
  listInstalledWorkflowBundles,
  loadWorkflowBundle,
} from "../src/runtimes/ponytrail/workflow-bundles";

describe("workflow bundles", () => {
  test("loads the bundled product-dev workflow", async () => {
    const bundle = await loadWorkflowBundle("product-dev");

    expect(bundle.manifest.name).toBe("product-dev");
    expect(bundle.manifest.skills.map((skill) => skill.source)).toEqual([
      "superpowers:brainstorming",
      "ponyrace",
      "superpowers:writing-plans",
      "pony-trail",
    ]);
    expect(bundle.manifest.steps.map((step) => [step.id, step.skill])).toEqual([
      ["shape", "superpowers:brainstorming"],
      ["requirement-review", "ponyrace"],
      ["plan", "superpowers:writing-plans"],
      ["evidence", "pony-trail"],
    ]);
  });

  test("rejects duplicate workflow step ids", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "workflow-bundle-"));
    const bundleDir = join(rootDir, "duplicate-steps");
    await mkdir(bundleDir, { recursive: true });
    await writeFile(
      join(bundleDir, "workflow.json"),
      JSON.stringify(
        {
          schemaVersion: "0.1",
          name: "duplicate-steps",
          version: "0.1.0",
          description: "Invalid duplicate step ids.",
          skills: [{ source: "pony-trail" }],
          steps: [
            { id: "same", title: "First", skill: "pony-trail" },
            { id: "same", title: "Second", skill: "pony-trail" },
          ],
        },
        null,
        2,
      ),
    );

    await expect(loadWorkflowBundle(bundleDir)).rejects.toThrow("Duplicate workflow step id: same");
  });

  test("scaffolds an authorable workflow bundle with a local skill", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "workflow-bundle-scaffold-"));

    const scaffold = await createWorkflowBundleScaffold({
      rootDir,
      name: "release-review",
    });

    await expect(stat(join(scaffold.bundleDir, "workflow.json"))).resolves.toBeTruthy();
    await expect(
      stat(join(scaffold.bundleDir, "skills", "custom-review", "SKILL.md")),
    ).resolves.toBeTruthy();

    const bundle = await loadWorkflowBundle(scaffold.bundleDir);
    expect(bundle.manifest.name).toBe("release-review");
    expect(bundle.manifest.skills.map((skill) => skill.source)).toContain("./skills/custom-review");
  });

  test("loads the release-review example workflow with its local skill", async () => {
    const bundle = await loadWorkflowBundle("examples/workflows/release-review");

    expect(bundle.manifest.name).toBe("release-review");
    expect(bundle.manifest.skills.map((skill) => skill.source)).toContain(
      "./skills/release-risk-review",
    );
    expect(bundle.manifest.steps.map((step) => step.id)).toEqual([
      "shape",
      "release-risk-review",
      "plan",
      "evidence",
    ]);
  });

  test("installs and lists workflow bundles under .ponyrace", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "workflow-bundle-install-"));
    const bundle = await loadWorkflowBundle("product-dev");

    const installed = await installWorkflowBundle({
      rootDir,
      bundle,
    });

    expect(installed.path).toBe(join(rootDir, ".ponyrace", "workflows", "product-dev.json"));
    const installedFile = JSON.parse(await readFile(installed.path, "utf8"));
    expect(installedFile.name).toBe("product-dev");
    expect(installedFile.steps).toHaveLength(4);

    const workflows = await listInstalledWorkflowBundles({ rootDir });
    expect(workflows.map((workflow) => workflow.name)).toEqual(["product-dev"]);
  });
});
