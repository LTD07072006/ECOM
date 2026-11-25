export type CompareRoute = {
	candidateId: string;
	destinationCode: string;
	distanceMeters: number;
	durationSeconds: number;
};

export function limitCandidates<T>(candidates: readonly T[]): T[] {
	return candidates.slice(0, 3);
}

export function compareCandidateRoutes(routes: readonly CompareRoute[]) {
	const groups = new Map<string, CompareRoute[]>();
	for (const route of routes) {
		const group = groups.get(route.destinationCode) ?? [];
		group.push(route);
		groups.set(route.destinationCode, group);
	}
	return [...groups.entries()].map(([destinationCode, grouped]) => ({
		destinationCode,
		routes: grouped,
	}));
}
