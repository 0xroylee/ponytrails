import path from "node:path";
import { initializeServerDatabase, projectBoardsTable } from "devos-db";
import { SERVER_DB_DIR } from "../config/constants";
import { LOCAL_BOARD_ID, LOCAL_WORKSPACE_ID } from "./constants";
import type { SetupDraft } from "./setup.types";

export async function saveSetupWorkspaceMetadata(
	cwd: string,
	draft: SetupDraft,
): Promise<void> {
	const database = await initializeServerDatabase(
		resolveSetupDatabasePath(cwd),
	);
	const now = new Date().toISOString();
	try {
		await database.db
			.insert(projectBoardsTable)
			.values({
				id: LOCAL_BOARD_ID,
				name: draft.workspaceName,
				description: "Projects created from the local web UI",
				ownerId: LOCAL_WORKSPACE_ID,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: projectBoardsTable.id,
				set: {
					name: draft.workspaceName,
					description: "Projects created from the local web UI",
					ownerId: LOCAL_WORKSPACE_ID,
					updatedAt: now,
				},
			});
	} finally {
		await database.close();
	}
}

function resolveSetupDatabasePath(cwd: string): string {
	return path.resolve(
		process.env.PIV_SERVER_DATABASE_PATH ||
			path.join(cwd, ".devos", "config", SERVER_DB_DIR),
	);
}
