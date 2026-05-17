import { describe, expect, it } from "bun:test";
import { normalizeSandboxValue } from "../src/features/config/env-normalizers";

describe("normalizeSandboxValue", () => {
	it("ignores inherited seatbelt sandbox markers", () => {
		expect(normalizeSandboxValue("seatbelt")).toBeUndefined();
		expect(normalizeSandboxValue(" SeatBelt ")).toBeUndefined();
	});

	it("keeps supported Codex sandbox values", () => {
		expect(normalizeSandboxValue("read-only")).toBe("read-only");
		expect(normalizeSandboxValue("workspace-write")).toBe("workspace-write");
		expect(normalizeSandboxValue("danger-full-access")).toBe(
			"danger-full-access",
		);
	});

	it("rejects unknown sandbox values", () => {
		expect(() => normalizeSandboxValue("not-a-sandbox")).toThrow(
			"Invalid CODEX_SANDBOX value 'not-a-sandbox'",
		);
	});
});
