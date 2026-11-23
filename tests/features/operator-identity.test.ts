import { expect, spyOn, test } from "bun:test";
import { randomBytes } from "node:crypto";
import {
	createOperatorSessionCookie,
	OPERATOR_SESSION_TTL_SECONDS,
	releaseIdentity,
	verifyOperatorSessionCookie,
	verifyOperatorToken,
} from "../../src/features/releases/authorization";

test("named operator tokens identify roles and reject duplicate credentials", () => {
	const original = process.env.ECOM_OPERATORS;
	const first = randomBytes(32).toString("base64url");
	const second = randomBytes(32).toString("base64url");
	const request = (token: string) =>
		new Request("http://localhost", {
			headers: { authorization: `Bearer ${token}` },
		});
	try {
		process.env.ECOM_OPERATORS = JSON.stringify([
			{ id: "alice", role: "steward", token: first },
			{ id: "bob", role: "reviewer", token: second },
		]);
		expect(releaseIdentity(request(first))).toEqual({
			role: "steward",
			actor: "alice",
		});
		expect(releaseIdentity(request(second))).toEqual({
			role: "reviewer",
			actor: "bob",
		});
		expect(
			releaseIdentity(request(randomBytes(32).toString("base64url"))),
		).toBeNull();
		process.env.ECOM_OPERATORS = JSON.stringify([
			{ id: "alice", role: "steward", token: first },
			{ id: "bob", role: "reviewer", token: first },
		]);
		expect(releaseIdentity(request(first))).toBeNull();
	} finally {
		if (original === undefined) delete process.env.ECOM_OPERATORS;
		else process.env.ECOM_OPERATORS = original;
	}
});

test("production refuses shared role credentials when named operators are absent", () => {
	const env: Record<string, string | undefined> = process.env;
	const original = {
		mode: env.NODE_ENV,
		operators: env.ECOM_OPERATORS,
		steward: env.RELEASE_STEWARD_TOKEN,
		reviewer: env.RELEASE_REVIEWER_TOKEN,
	};
	const steward = randomBytes(32).toString("base64url");
	try {
		env.NODE_ENV = "production";
		delete env.ECOM_OPERATORS;
		env.RELEASE_STEWARD_TOKEN = steward;
		env.RELEASE_REVIEWER_TOKEN = randomBytes(32).toString("base64url");
		expect(
			releaseIdentity(
				new Request("http://localhost", {
					headers: { authorization: `Bearer ${steward}` },
				}),
			),
		).toBeNull();
	} finally {
		for (const [key, value] of Object.entries({
			NODE_ENV: original.mode,
			ECOM_OPERATORS: original.operators,
			RELEASE_STEWARD_TOKEN: original.steward,
			RELEASE_REVIEWER_TOKEN: original.reviewer,
		})) {
			if (value === undefined) delete env[key];
			else env[key] = value;
		}
	}
});

test("operator expiration disables expired tokens, caps session TTL, and invalidates sessions", () => {
	const original = process.env.ECOM_OPERATORS;
	const expiredToken = randomBytes(32).toString("base64url");
	const shortLivedToken = randomBytes(32).toString("base64url");
	const longLivedToken = randomBytes(32).toString("base64url");
	const nowMs = Date.parse("2026-11-23T12:00:00.000Z");
	const shortExpiresAt = new Date(nowMs + 10 * 60 * 1000).toISOString();
	const longExpiresAt = new Date(nowMs + 5 * 60 * 60 * 1000).toISOString();

	try {
		process.env.ECOM_OPERATORS = JSON.stringify([
			{
				id: "expired-op",
				role: "steward",
				token: expiredToken,
				expiresAt: new Date(nowMs - 1000).toISOString(),
			},
			{
				id: "short-op",
				role: "reviewer",
				token: shortLivedToken,
				expiresAt: shortExpiresAt,
			},
			{
				id: "long-op",
				role: "steward",
				token: longLivedToken,
				expiresAt: longExpiresAt,
			},
		]);

		expect(verifyOperatorToken(expiredToken, nowMs)).toBeNull();
		expect(verifyOperatorToken(shortLivedToken, nowMs)).toEqual({
			role: "reviewer",
			actor: "short-op",
		});
		expect(verifyOperatorToken(longLivedToken, nowMs)).toEqual({
			role: "steward",
			actor: "long-op",
		});
		expect(
			createOperatorSessionCookie(
				{ actor: "expired-op", role: "steward" },
				nowMs,
			),
		).toBeNull();

		const shortCookie = createOperatorSessionCookie(
			{ actor: "short-op", role: "reviewer" },
			nowMs,
		);
		expect(shortCookie).not.toBeNull();
		if (!shortCookie) throw new Error("Expected short-lived cookie");
		const shortPayload = JSON.parse(
			Buffer.from(shortCookie.value.split(".")[0], "base64url").toString(
				"utf8",
			),
		) as { exp: number };
		expect(shortPayload.exp).toBeLessThanOrEqual(
			Math.floor(Date.parse(shortExpiresAt) / 1000),
		);
		expect(shortPayload.exp).toBe(Math.floor(nowMs / 1000) + 600);
		expect(shortCookie.header).toContain("Max-Age=600");
		expect(
			verifyOperatorSessionCookie(shortCookie.header, nowMs + 60_000),
		).toEqual({
			actor: "short-op",
			role: "reviewer",
		});
		expect(
			verifyOperatorSessionCookie(
				shortCookie.header,
				Date.parse(shortExpiresAt),
			),
		).toBeNull();

		const longCookie = createOperatorSessionCookie(
			{ actor: "long-op", role: "steward" },
			nowMs,
		);
		expect(longCookie).not.toBeNull();
		if (!longCookie) throw new Error("Expected long-lived cookie");
		const longPayload = JSON.parse(
			Buffer.from(longCookie.value.split(".")[0], "base64url").toString("utf8"),
		) as { exp: number };
		expect(longPayload.exp).toBe(
			Math.floor(nowMs / 1000) + OPERATOR_SESSION_TTL_SECONDS,
		);
		expect(longCookie.header).toContain(
			`Max-Age=${OPERATOR_SESSION_TTL_SECONDS}`,
		);
	} finally {
		if (original === undefined) delete process.env.ECOM_OPERATORS;
		else process.env.ECOM_OPERATORS = original;
	}
});

test("malformed expiresAt rejects the entire ECOM_OPERATORS config and warns once outside test env", () => {
	const env: Record<string, string | undefined> = process.env;
	const originalMode = env.NODE_ENV;
	const originalOperators = env.ECOM_OPERATORS;
	const validToken = randomBytes(32).toString("base64url");
	const otherToken = randomBytes(32).toString("base64url");
	const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

	try {
		for (const badExpiresAt of [
			"not-a-date",
			"2026-02-30T00:00:00Z",
			12345,
			null,
		]) {
			env.ECOM_OPERATORS = JSON.stringify([
				{ id: "alice", role: "steward", token: validToken },
				{
					id: "bob",
					role: "reviewer",
					token: otherToken,
					expiresAt: badExpiresAt,
				},
			]);
			expect(verifyOperatorToken(validToken)).toBeNull();
			expect(verifyOperatorToken(otherToken)).toBeNull();
		}
		expect(warnSpy).not.toHaveBeenCalled();

		env.NODE_ENV = "production";
		expect(verifyOperatorToken(validToken)).toBeNull();
		expect(verifyOperatorToken(validToken)).toBeNull();
		expect(warnSpy).toHaveBeenCalledTimes(1);
		const logged = String(warnSpy.mock.calls[0]?.[0] ?? "");
		expect(JSON.parse(logged)).toEqual({ event: "operator_config_invalid" });
		expect(logged).not.toContain(validToken);
		expect(logged).not.toContain("alice");
	} finally {
		warnSpy.mockRestore();
		if (originalMode === undefined) delete env.NODE_ENV;
		else env.NODE_ENV = originalMode;
		if (originalOperators === undefined) delete env.ECOM_OPERATORS;
		else env.ECOM_OPERATORS = originalOperators;
	}
});
