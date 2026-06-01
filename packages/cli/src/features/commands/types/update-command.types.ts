import type { UpdateCommand } from "../../../types/args.types";
import type { assertCommandOk, runCommand } from "../../../utils/shell";

export type UpdateCommandDeps = {
	runCommand?: typeof runCommand;
	assertCommandOk?: typeof assertCommandOk;
};

export type { UpdateCommand };
