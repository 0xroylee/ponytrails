import { describe, expect, it } from "bun:test";
import { captureWithRuntime } from "./args-test-helpers";

describe("createCliProgram update", () => {
	it("runs update command", async () => {
		expect(
			(await captureWithRuntime(["bun", "devos", "update"])).calls,
		).toEqual([
			{
				name: "update",
				payload: { cwd: "/tmp/devos-test" },
			},
		]);
	});
});
