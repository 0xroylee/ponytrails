import { describe, expect, it } from "bun:test";
import { parseReviewOutcome } from "../src/features/workflow/review/review";

describe("parseReviewOutcome", () => {
	it("parses pass with no bugs", () => {
		const text = `
RESULT: PASS
SUMMARY: Looks good.
BUGS_JSON:
[]
`;
		const outcome = parseReviewOutcome(text);
		expect(outcome.passed).toBe(true);
		expect(outcome.bugs).toHaveLength(0);
	});

	it("parses fail with bugs", () => {
		const text = `
RESULT: FAIL
SUMMARY: Found regressions.
BUGS_JSON:
[{"title":"Bug A","body":"Details"}]
`;
		const outcome = parseReviewOutcome(text);
		expect(outcome.passed).toBe(false);
		expect(outcome.bugs).toHaveLength(1);
		expect(outcome.bugs[0]?.title).toBe("Bug A");
	});

	it("treats mixed pass/fail markers as failure", () => {
		const text = `
RESULT: PASS
RESULT: FAIL
SUMMARY: Mixed output.
BUGS_JSON:
[]
`;
		const outcome = parseReviewOutcome(text);
		expect(outcome.passed).toBe(false);
	});

	it("falls back to empty bug list when BUGS_JSON is malformed", () => {
		const text = `
RESULT: FAIL
SUMMARY: Bad json.
BUGS_JSON:
[{"title":"Bug A","body":"oops"}
`;
		const outcome = parseReviewOutcome(text);
		expect(outcome.bugs).toEqual([]);
		expect(outcome.passed).toBe(false);
	});

	it("treats PASS with advisory suggestions as pass", () => {
		const text = `
RESULT: PASS
SUMMARY: The PR successfully implements the feature. All tests pass.

1. **Minor suggestion (Low)**: Consider adding a comment here.
2. **Naming (Low)**: The variable could have a better name.
3. **Empty catch blocks (Low)**: Consider logging debug info.

\`\`\`json
[{"title":"PR title mismatch","body":"The title is misleading."},{"title":"Underscore parameter","body":"Add documentation."},{"title":"Empty catch blocks","body":"Consider logging."}]
\`\`\`
`;
		const outcome = parseReviewOutcome(text);
		expect(outcome.passed).toBe(true);
		expect(outcome.bugs).toHaveLength(0);
	});

	it("parses bug list from fenced json when BUGS_JSON is missing", () => {
		const text = `
RESULT: FAIL
SUMMARY: Found issues.
\`\`\`json
[{"title":"Bug A","body":"Details"}]
\`\`\`
`;
		const outcome = parseReviewOutcome(text);
		expect(outcome.bugs).toHaveLength(1);
		expect(outcome.bugs[0]?.title).toBe("Bug A");
	});
});
