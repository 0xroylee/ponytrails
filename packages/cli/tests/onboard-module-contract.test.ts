import { describe, expect, it } from "bun:test";
import {
	collectOnboardDraft,
	createDefaultOnboardInstanceDraft,
	writeOnboardFiles,
} from "../src/features/onboard";

describe("onboard module contract", () => {
	it("exports onboard-named draft, instance, and file helpers", () => {
		expect(collectOnboardDraft).toBeFunction();
		expect(createDefaultOnboardInstanceDraft).toBeFunction();
		expect(writeOnboardFiles).toBeFunction();
	});
});
