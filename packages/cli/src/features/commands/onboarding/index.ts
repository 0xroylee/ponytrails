import type { OnboardCommand } from "../../../args";
import { runOnboardCheck, runOnboardWizard } from "../../onboard";

export async function handleOnboardCommand(
	command: OnboardCommand,
	cwd: string,
): Promise<void> {
	if (command.check) {
		await runOnboardCheck(cwd);
		return;
	}
	await runOnboardWizard(cwd);
}
