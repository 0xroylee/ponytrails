import { afterEach, describe, expect, it } from "bun:test";
import { chatSessionsTable } from "devos-db";
import { createJsonRequest, createServerTestApp } from "./app-test-helpers";
import {
	type DrizzleServerTestDatabase,
	createDrizzleServerTestDatabase,
} from "./server-db-test-helpers";

let testDatabase: DrizzleServerTestDatabase | undefined;

afterEach(async () => {
	if (testDatabase) {
		await testDatabase.cleanup();
		testDatabase = undefined;
	}
});

describe("chat session pin routes", () => {
	it("pins sessions above unpinned sessions and restores recency order", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		await testDatabase.db.insert(chatSessionsTable).values([
			chatSessionRow({
				id: "old-session",
				title: "Old",
				updatedAt: "2026-05-13T00:00:00.000Z",
			}),
			chatSessionRow({
				id: "middle-session",
				title: "Middle",
				updatedAt: "2026-05-13T00:05:00.000Z",
			}),
			chatSessionRow({
				id: "new-session",
				title: "New",
				updatedAt: "2026-05-13T00:10:00.000Z",
			}),
		]);
		const app = createServerTestApp(testDatabase.db, {
			workspacePath: testDatabase.path,
		});

		const pinResponse = await app(
			createJsonRequest("PATCH", "/api/chat/sessions/old-session", {
				pinned: true,
			}),
		);
		const pinned = (await pinResponse.json()) as {
			pinned: boolean;
			updatedAt: string;
		};

		expect(pinResponse.status).toBe(200);
		expect(pinned.pinned).toBe(true);
		await expectSessionOrder(app, [
			"old-session",
			"new-session",
			"middle-session",
		]);

		const unpinResponse = await app(
			createJsonRequest("PATCH", "/api/chat/sessions/old-session", {
				pinned: false,
			}),
		);
		const unpinned = (await unpinResponse.json()) as {
			pinned: boolean;
			updatedAt: string;
		};

		expect(unpinned.pinned).toBe(false);
		expect(unpinned.updatedAt).toBe(pinned.updatedAt);
		await expectSessionOrder(app, [
			"new-session",
			"middle-session",
			"old-session",
		]);
	});
});

async function expectSessionOrder(
	app: (request: Request) => Promise<Response>,
	expectedIds: string[],
): Promise<void> {
	const response = await app(
		new Request("http://localhost/api/chat/sessions?workspaceId=owner-1"),
	);
	const sessions = (await response.json()) as Array<{ id: string }>;
	expect(sessions.map((session) => session.id)).toEqual(expectedIds);
}

function chatSessionRow(overrides: {
	id: string;
	title: string;
	updatedAt: string;
}) {
	return {
		id: overrides.id,
		workspaceId: "owner-1",
		projectId: null,
		taskId: null,
		title: overrides.title,
		pendingRequest: null,
		pendingQuestions: null,
		archived: false,
		pinned: false,
		createdAt: "2026-05-13T00:00:00.000Z",
		updatedAt: overrides.updatedAt,
	};
}
