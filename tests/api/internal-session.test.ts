import { expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import {
	DELETE as logout,
	GET as getSession,
	POST as login,
} from "../../src/app/api/internal/session/route";
import {
	createOperatorSessionCookie,
	OPERATOR_SESSION_COOKIE,
	releaseIdentity,
	verifyOperatorSessionCookie,
} from "../../src/features/releases/authorization";

test("operator session endpoint issues HttpOnly SameSite=Strict cookies, authenticates, and logs out", async () => {
	const originalOperators = process.env.ECOM_OPERATORS;
	const stewardToken = randomBytes(32).toString("base64url");
	try {
		process.env.ECOM_OPERATORS = JSON.stringify([
			{ id: "alice-steward", role: "steward", token: stewardToken },
		]);

		const bad = await login(
			new Request("http://localhost/api/internal/session", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token: randomBytes(32).toString("base64url") }),
			}),
		);
		expect(bad.status).toBe(401);

		const ok = await login(
			new Request("http://localhost/api/internal/session", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token: stewardToken }),
			}),
		);
		expect(ok.status).toBe(200);
		const setCookie = ok.headers.get("set-cookie") ?? "";
		expect(setCookie).toContain(`${OPERATOR_SESSION_COOKIE}=`);
		expect(setCookie).toContain("HttpOnly");
		expect(setCookie).toContain("SameSite=Strict");
		const cookiePair = setCookie.split(";")[0];

		const check = await getSession(
			new Request("http://localhost/api/internal/session", {
				headers: { cookie: cookiePair },
			}),
		);
		expect(check.status).toBe(200);
		expect(await check.json()).toEqual({
			authenticated: true,
			actor: "alice-steward",
			role: "steward",
		});

		// Tampered cookie is rejected
		expect(
			releaseIdentity(
				new Request("http://localhost", {
					headers: { cookie: `${cookiePair}tampered` },
				}),
			),
		).toBeNull();

		// Expired cookie is rejected
		const created = createOperatorSessionCookie(
			{ actor: "alice-steward", role: "steward" },
			Date.now() - 3 * 60 * 60 * 1000,
		);
		expect(created).not.toBeNull();
		expect(
			verifyOperatorSessionCookie(
				`${OPERATOR_SESSION_COOKIE}=${created?.value ?? ""}`,
			),
		).toBeNull();

		// Revoking operator immediately invalidates existing cookie
		process.env.ECOM_OPERATORS = JSON.stringify([
			{
				id: "other-steward",
				role: "steward",
				token: randomBytes(32).toString("base64url"),
			},
		]);
		expect(
			releaseIdentity(
				new Request("http://localhost", { headers: { cookie: cookiePair } }),
			),
		).toBeNull();

		const out = await logout(
			new Request("http://localhost/api/internal/session", {
				method: "DELETE",
			}),
		);
		expect(out.status).toBe(200);
		expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
	} finally {
		if (originalOperators === undefined) delete process.env.ECOM_OPERATORS;
		else process.env.ECOM_OPERATORS = originalOperators;
	}
});
