import type { CodexReasoningEffort } from "../../features/types";
import type { SetupDraft } from "./setup.types";
export { DEFAULT_CONFIG_FILE } from "../config/constants";
export { INSTANCE_CONFIG_FILE } from "../config/home-paths";

export const ENV_FILE = ".env";
export const DEFAULT_WORKSPACE_NAME = "Default Workspace";
export const DEFAULT_PROJECT_NAME = "Default Project";
export const LOCAL_WORKSPACE_ID = "owner-1";
export const LOCAL_BOARD_ID = "board-1";
export const DEFAULT_BASE_BRANCH = "main";
export const RTK_INSTALL_URL = "https://github.com/rtk-ai/rtk";
export const GITHUB_CLI_INSTALL_URL =
	"https://cli.github.com/manual/installation";
export const LINEAR_API_KEY_SETTINGS_URL =
	"https://linear.app/settings/account/security";

export const DEFAULT_STATUS_MAP: SetupDraft["statusMap"] = {
	backlog: "Backlog",
	assigned: "Todo",
	planning: "In Progress",
	implementing: "In Progress",
	pr_created: "In Review",
	reviewing: "In Review",
	testing: "In Review",
	blocked: "Canceled",
	done: "Done",
};

export const DEFAULT_LABEL_MAP: SetupDraft["labelMap"] = {
	pr_created: "PR Created",
	reviewing: "Reviewing",
	testing: "Testing",
};

export const DEFAULT_REASONING_EFFORTS = {
	plan: "low",
	implement: "low",
	reviewTest: "medium",
} as const satisfies Record<string, CodexReasoningEffort>;
