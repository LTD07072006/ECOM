import { boundedQuery, observeApi } from "../../lib/api-operations";
import { error } from "../../lib/http";
import {
	releaseIdentity,
	type OperatorIdentity,
} from "../releases/authorization";

export function withStewardSnapshot(
	request: Request,
	handler: (identity: OperatorIdentity) => Promise<Response>,
) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity || identity.role !== "steward")
				return error("A valid steward access token is required.", 401);
			if (!boundedQuery(request))
				return error("Unexpected report parameters.", 400);
			return handler(identity);
		},
		true,
	);
}

export function snapshotMethodNotAllowed(
	request: Request,
	allow: string,
	message: string,
) {
	return withStewardSnapshot(request, async () => {
		const response = error(message, 405);
		response.headers.set("Allow", allow);
		return response;
	});
}
