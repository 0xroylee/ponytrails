import { describe, expect, it } from "bun:test";
import { SlackApiError, createSlackClient } from "../src/plugins/slack";
import { type FetchCall, createFetchMock } from "./slack-test-helpers";

describe("slack plugin client", () => {
	it("checks bot authentication with auth.test", async () => {
		const calls: FetchCall[] = [];
		const client = createSlackClient({
			botToken: "xoxb-secret",
			fetchImpl: createFetchMock(calls, [
				{
					ok: true,
					url: "https://devos.slack.com/",
					team: "Devos",
					user: "devos-bot",
					team_id: "T123",
					user_id: "U123",
					bot_id: "B123",
					enterprise_id: "E123",
				},
			]),
		});

		await expect(client.testConnection()).resolves.toEqual({
			url: "https://devos.slack.com/",
			team: "Devos",
			user: "devos-bot",
			teamId: "T123",
			userId: "U123",
			botId: "B123",
			enterpriseId: "E123",
		});
		expect(calls[0]?.url).toBe("https://slack.com/api/auth.test");
		expect(calls[0]?.headers).toMatchObject({
			authorization: "Bearer xoxb-secret",
			"content-type": "application/json",
		});
		expect(calls[0]?.body).toEqual({});
	});

	it("sends messages with optional thread ts", async () => {
		const calls: FetchCall[] = [];
		const client = createSlackClient({
			botToken: "xoxb-secret",
			fetchImpl: createFetchMock(calls, [
				{
					ok: true,
					channel: "C123",
					ts: "1770000000.000100",
					message: {
						text: "hello",
						thread_ts: "1770000000.000001",
					},
				},
			]),
		});

		await expect(
			client.sendMessage({
				channelId: "C123",
				text: "hello",
				threadTs: "1770000000.000001",
			}),
		).resolves.toEqual({
			channelId: "C123",
			ts: "1770000000.000100",
			text: "hello",
			threadTs: "1770000000.000001",
		});
		expect(calls[0]?.url).toBe("https://slack.com/api/chat.postMessage");
		expect(calls[0]?.body).toEqual({
			channel: "C123",
			text: "hello",
			thread_ts: "1770000000.000001",
		});
	});

	it("receives and normalizes conversation history messages", async () => {
		const calls: FetchCall[] = [];
		const client = createSlackClient({
			botToken: "xoxb-secret",
			fetchImpl: createFetchMock(calls, [
				{
					ok: true,
					messages: [
						{
							ts: "1770000001.000100",
							text: "ping",
							user: "U123",
							type: "message",
						},
						{
							ts: "1770000002.000100",
							text: "bot reply",
							bot_id: "B123",
							thread_ts: "1770000001.000100",
							type: "message",
							subtype: "bot_message",
						},
					],
					response_metadata: { next_cursor: "cursor-2" },
				},
			]),
		});

		await expect(
			client.receiveMessages({
				channelId: "C123",
				oldest: "1770000000.000000",
				latest: "1770000010.000000",
				limit: 2,
				cursor: "cursor-1",
			}),
		).resolves.toEqual({
			messages: [
				{
					ts: "1770000001.000100",
					channelId: "C123",
					text: "ping",
					user: "U123",
					type: "message",
				},
				{
					ts: "1770000002.000100",
					channelId: "C123",
					text: "bot reply",
					botId: "B123",
					threadTs: "1770000001.000100",
					type: "message",
					subtype: "bot_message",
				},
			],
			nextCursor: "cursor-2",
		});
		expect(calls[0]?.url).toBe("https://slack.com/api/conversations.history");
		expect(calls[0]?.body).toEqual({
			channel: "C123",
			oldest: "1770000000.000000",
			latest: "1770000010.000000",
			limit: 2,
			cursor: "cursor-1",
		});
	});

	it("runs send then receive connectivity check", async () => {
		const calls: FetchCall[] = [];
		const client = createSlackClient({
			botToken: "xoxb-secret",
			fetchImpl: createFetchMock(calls, [
				{
					ok: true,
					channel: "D123",
					ts: "1770000000.000100",
					message: { text: "test" },
				},
				{
					ok: true,
					messages: [
						{
							ts: "1770000000.000100",
							text: "test",
							user: "U123",
							type: "message",
						},
					],
				},
			]),
		});

		await expect(
			client.runConnectivityCheck({
				channelId: "D123",
				testText: "test",
				receiveLimit: 1,
				threadTs: "1770000000.000001",
			}),
		).resolves.toEqual({
			sent: {
				channelId: "D123",
				ts: "1770000000.000100",
				text: "test",
			},
			received: [
				{
					ts: "1770000000.000100",
					channelId: "D123",
					text: "test",
					user: "U123",
					type: "message",
				},
			],
			sendSucceeded: true,
			receiveSucceeded: true,
		});
		expect(
			calls.map((call) => {
				const parts = call.url.split("/");
				return parts[parts.length - 1];
			}),
		).toEqual(["chat.postMessage", "conversations.history"]);
		expect(calls[0]?.body).toMatchObject({
			channel: "D123",
			text: "test",
			thread_ts: "1770000000.000001",
		});
		expect(calls[1]?.body).toEqual({
			channel: "D123",
			limit: 1,
		});
	});

	it("throws sanitized errors for Slack failures", async () => {
		const client = createSlackClient({
			botToken: "xoxb-secret-token",
			fetchImpl: createFetchMock([], [{ ok: false, error: "invalid_auth" }]),
		});

		await expect(client.testConnection()).rejects.toThrow(SlackApiError);
		await expect(client.testConnection()).rejects.not.toThrow("secret-token");
	});

	it("throws sanitized errors for HTTP failures", async () => {
		const client = createSlackClient({
			botToken: "xoxb-secret-token",
			fetchImpl: createFetchMock([], [{ ok: false, error: "bad_gateway" }], {
				status: 502,
				statusText: "Bad Gateway",
			}),
		});

		await expect(client.testConnection()).rejects.toThrow(
			"Slack API auth.test failed: status 502: bad_gateway",
		);
		await expect(client.testConnection()).rejects.not.toThrow("secret-token");
	});
});
