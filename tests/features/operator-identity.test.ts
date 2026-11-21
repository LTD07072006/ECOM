import { expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { releaseIdentity } from "../../src/features/releases/authorization";

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
