import type { LogisticsDestination } from "./logistics-network";

export type LogisticsMatrixLeg = {
	destinationCode: string;
	status: "pending" | "live" | "baseline" | "unavailable";
	distanceMeters?: number | null;
	durationSeconds?: number | null;
	provider?: string;
	fallback?: boolean;
	observedOn?: string;
	sourceUrl?: string;
	errorCategory?: "provider_error" | "timeout" | "quota" | "invalid_response";
};

export type LogisticsMatrixRow = LogisticsMatrixLeg & {
	name: string;
	kind: LogisticsDestination["kind"];
	provinceName: string;
};

export function toLogisticsMatrixRows(
	destinations: readonly LogisticsDestination[],
	legs: readonly LogisticsMatrixLeg[],
): LogisticsMatrixRow[] {
	const byCode = new Map(legs.map((leg) => [leg.destinationCode, leg]));
	return destinations.flatMap((destination) => {
		const leg = byCode.get(destination.code);
		return [
			{
				...(leg ?? {
					destinationCode: destination.code,
					status: "pending" as const,
				}),
				name: destination.name,
				kind: destination.kind,
				provinceName: destination.provinceName,
			},
		];
	});
}

export function filterLogisticsMatrix(
	rows: readonly LogisticsMatrixRow[],
	filter: {
		kind?: LogisticsDestination["kind"];
		status?: LogisticsMatrixLeg["status"];
	},
): LogisticsMatrixRow[] {
	return rows.filter(
		(row) =>
			(!filter.kind || row.kind === filter.kind) &&
			(!filter.status || row.status === filter.status),
	);
}
