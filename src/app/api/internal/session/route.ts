import { z } from "zod";
import {
	clearOperatorSessionCookie,
	createOperatorSessionCookie,
	releaseIdentity,
	verifyOperatorToken,
} from "../../../../features/releases/authorization";
import { observeApi } from "../../../../lib/api-operations";
import { error, json, readBoundedJson } from "../../../../lib/http";

export const dynamic = "force-dynamic";

const loginSchema = z.strictObject({
	token: z.string().trim().min(43).max(128),
});

export function GET(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity) return json({ authenticated: false });
			return json({
				authenticated: true,
				actor: identity.actor,
				role: identity.role,
			});
		},
		true,
	);
}

export function POST(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			let token: string | null = null;
			const authHeader = request.headers.get("authorization");
			if (authHeader) {
				token =
					authHeader.match(/^Bearer ([A-Za-z0-9_-]{43,128})$/)?.[1] ?? null;
			} else {
				const body = await readBoundedJson(request, 2_048);
				if (!body.ok) return error(body.message, body.status);
				const parsed = loginSchema.safeParse(body.value);
				if (!parsed.success)
					return error("Valid operator token required.", 401);
				token = parsed.data.token;
			}

			const identity = token ? verifyOperatorToken(token) : null;
			if (!identity) return error("Unauthorized.", 401);

			const cookie = createOperatorSessionCookie(identity);
			if (!cookie) return error("Session configuration unavailable.", 503);

			return json(
				{
					authenticated: true,
					actor: identity.actor,
					role: identity.role,
					expiresAt: cookie.expiresAt,
				},
				{
					headers: { "Set-Cookie": cookie.header },
				},
			);
		},
		true,
	);
}

export function DELETE(request: Request) {
	return observeApi(
		"internal",
		request,
		async () =>
			json(
				{ authenticated: false },
				{
					headers: { "Set-Cookie": clearOperatorSessionCookie() },
				},
			),
		true,
	);
}
