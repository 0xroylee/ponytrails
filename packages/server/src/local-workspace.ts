import { projectBoardsTable } from "devos-db";
import type { ServerDatabase } from "devos-db";

export const LOCAL_BOARD_ID = "board-1";
export const LOCAL_WORKSPACE_ID = "owner-1";

export async function ensureLocalProjectBoard(
	db: ServerDatabase["db"],
	now = new Date().toISOString(),
): Promise<void> {
	await db
		.insert(projectBoardsTable)
		.values({
			id: LOCAL_BOARD_ID,
			name: "Local Workspace",
			description: "Projects created from the local web UI",
			ownerId: LOCAL_WORKSPACE_ID,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoNothing();
}
