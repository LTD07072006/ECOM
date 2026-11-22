import { expect, test } from "bun:test";
import {
	GET as getSnapshots,
	POST as createSnapshot,
} from "../../src/app/api/internal/inquiries/snapshots/route";
import { boundedQuery } from "../../src/lib/api-operations";

test("reporting endpoint rejects unexpected filters before database access", async () => {
	expect(
		boundedQuery(
			new Request(
				"http://localhost/api/internal/inquiries?page=2&unexpected=value",
			),
			"page",
		),
	).toBeNull();
});

test("snapshot endpoint requires steward authorization", async () => {
	const request = new Request(
		"http://localhost/api/internal/inquiries/snapshots",
	);
	expect((await getSnapshots(request)).status).toBe(401);
	expect(
		(await createSnapshot(new Request(request, { method: "POST", body: "{}" })))
			.status,
	).toBe(401);
});
