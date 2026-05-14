import type { LoadedConfig } from "devos/features/config";
import type { RunOptions } from "devos/features/types";

export async function runCronWorkflow(
	config: LoadedConfig,
	options: RunOptions,
): Promise<void> {
	const { runWorkflow } = await import("devos/features/workflow/workflow");
	await runWorkflow(config, options);
}
