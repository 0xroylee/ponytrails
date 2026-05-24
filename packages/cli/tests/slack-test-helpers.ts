export interface FetchCall {
	url: string;
	headers: Record<string, string>;
	body: Record<string, unknown>;
}

export function createFetchMock(
	calls: FetchCall[],
	payloads: unknown[],
	responseInit: { status?: number; statusText?: string } = {},
): typeof fetch {
	let index = 0;
	return (async (input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({
			url: String(input),
			headers: headersToRecord(init?.headers),
			body:
				typeof init?.body === "string"
					? (JSON.parse(init.body) as Record<string, unknown>)
					: {},
		});
		const payload = payloads[index] ?? payloads[payloads.length - 1];
		index += 1;
		return new Response(JSON.stringify(payload), {
			status: responseInit.status ?? 200,
			statusText: responseInit.statusText,
		});
	}) as typeof fetch;
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
	if (!headers) {
		return {};
	}
	const record: Record<string, string> = {};
	new Headers(headers).forEach((value, key) => {
		record[key] = value;
	});
	return record;
}
