import { createApiClient } from "./client";
import type {
	HealthResponse,
	ProjectBoardRecord,
	WorkspaceProjectRecord,
} from "./client.types";
import { createWebApiClient } from "./web-client";

const client = createApiClient();
const webClient = createWebApiClient();

const healthResponsePromise: Promise<HealthResponse> = client.getHealth();
const webHealthResponsePromise: Promise<HealthResponse> = webClient.getHealth();
const workspaceProjectsPromise: Promise<WorkspaceProjectRecord[]> =
	webClient.listWorkspaceProjects("workspace-1");
const projectBoardPromise: Promise<ProjectBoardRecord> =
	webClient.getProjectBoard("workspace-1", "project-1");

void healthResponsePromise;
void webHealthResponsePromise;
void workspaceProjectsPromise;
void projectBoardPromise;
