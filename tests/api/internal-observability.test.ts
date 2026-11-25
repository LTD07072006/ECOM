import { afterEach, describe, expect, test } from "bun:test";
import { GET } from "../../src/app/api/internal/observability/route";

const original = process.env.ECOM_OPERATORS;

afterEach(() => {
	if (original === undefined) delete process.env.ECOM_OPERATORS;
	else process.env.ECOM_OPERATORS = original;
});

describe("internal observability API", () => {
	test("rejects unauthenticated metrics access", async () => {
		process.env.ECOM_OPERATORS = JSON.stringify([]);
		const response = await GET(
			new Request("http://localhost/api/internal/observability?hours=6"),
		);
		expect(response.status).toBe(401);
	});
});
