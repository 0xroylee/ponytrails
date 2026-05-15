import { describe, expect, it } from "bun:test";
import { parseArgs } from "../src/args";

describe("parseArgs daemon", () => {
	it("parses daemon cli-only command", () => {
		expect(parseArgs(["bun", "devos", "daemon", "--cli-only"])).toEqual({
			kind: "daemon",
			cliOnly: true,
		});
	});
});
