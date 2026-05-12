import { afterEach, describe, expect, test } from "bun:test";

const originalFetch = globalThis.fetch;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_MONITORING_API_BASE_URL;
let loadCount = 0;

async function loadMonitoringModule() {
	loadCount += 1;
	return import(`../../web/src/lib/api/monitoring.ts?cachebust=${loadCount}`);
}

afterEach(() => {
	globalThis.fetch = originalFetch;
	if (originalApiBaseUrl === undefined) {
		process.env.NEXT_PUBLIC_MONITORING_API_BASE_URL = undefined;
		return;
	}

	process.env.NEXT_PUBLIC_MONITORING_API_BASE_URL = originalApiBaseUrl;
});

describe("web monitoring API client", () => {
	test("uses relative monitoring routes by default", async () => {
		process.env.NEXT_PUBLIC_MONITORING_API_BASE_URL = undefined;
		const requests: string[] = [];

		globalThis.fetch = (async (input: RequestInfo | URL) => {
			requests.push(String(input));
			return new Response("[]", {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as unknown as typeof fetch;

		const monitoring = await loadMonitoringModule();
		await monitoring.fetchJobs();

		expect(requests).toEqual(["/api/jobs"]);
	});

	test("uses configured monitoring api base url when provided", async () => {
		process.env.NEXT_PUBLIC_MONITORING_API_BASE_URL =
			"http://127.0.0.1:8787/service/";
		const requests: string[] = [];

		globalThis.fetch = (async (input: RequestInfo | URL) => {
			requests.push(String(input));
			return new Response("[]", {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as unknown as typeof fetch;

		const monitoring = await loadMonitoringModule();
		await monitoring.fetchTokenUsage();

		expect(requests).toEqual(["http://127.0.0.1:8787/api/token-usage"]);
	});

	test("throws detailed error when request fails", async () => {
		process.env.NEXT_PUBLIC_MONITORING_API_BASE_URL =
			"http://127.0.0.1:8787/service/";

		globalThis.fetch = (async () =>
			new Response("Not Found", {
				status: 404,
				statusText: "Not Found",
			})) as unknown as typeof fetch;

		const monitoring = await loadMonitoringModule();

		await expect(monitoring.fetchSkills()).rejects.toThrow(
			"Monitoring API request failed (404 Not Found) for http://127.0.0.1:8787/api/skills",
		);
	});
});
