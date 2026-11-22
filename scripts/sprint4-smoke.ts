import { Buffer } from "node:buffer";

type Sample = { duration: number; bytes: number };

const origin = new URL(process.argv[2] ?? "http://127.0.0.1:3000");
const rounds = Number(process.argv[3] ?? 12);
const budgets: Record<string, number> = {
	search: 2500,
	searchCommune: 2500,
	profile: 2500,
	compare: 2500,
	export: 5000,
	boundaries: 5000,
	layers: 2500,
	health: 2000,
};
const byteBudgets: Record<string, number> = {
	search: 64 * 1024,
	searchCommune: 64 * 1024,
	profile: 64 * 1024,
	compare: 96 * 1024,
	export: 512 * 1024,
	boundaries: 3 * 1024 * 1024,
	layers: 256 * 1024,
	health: 4 * 1024,
};
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 15) {
	throw new Error(
		"Use an integer from 1 through 15 rounds to stay within the export quota.",
	);
}

async function measure(path: string) {
	const started = performance.now();
	const response = await fetch(new URL(path, origin), {
		signal: AbortSignal.timeout(20_000),
	});
	if (!response.ok)
		throw new Error(
			`Smoke route ${path.split("?")[0]} returned HTTP ${response.status}.`,
		);
	const body = await response.text();
	return {
		duration: performance.now() - started,
		bytes: Buffer.byteLength(body),
		body,
	};
}

const navigation = await measure("/");
if (!navigation.body.includes("Vietnam Market Intelligence"))
	throw new Error("Market workspace did not render.");
const boundaries = await measure("/api/map/provinces");
const provinceIds: string[] = JSON.parse(boundaries.body).data.features.map(
	(feature: { id: string }) => feature.id,
);
if (provinceIds.length < 20)
	throw new Error(
		"The published boundary release needs at least 20 provinces for this smoke test.",
	);
const [first] = provinceIds;
const routes = {
	search: "/api/geographies?q=ha+noi&level=province",
	searchCommune: "/api/geographies?q=ba+dinh&level=commune",
	profile: `/api/geographies/${first}`,
	compare: `/api/geographies/compare?ids=${provinceIds.slice(0, 3).join(",")}`,
	export: `/api/geographies/export?format=json&ids=${provinceIds.slice(0, 20).join(",")}`,
	boundaries: "/api/map/provinces",
	layers: "/api/map/layers",
	health: "/api/health",
};
const probes = Object.entries(routes).map(([name, path]) => ({
	name,
	path,
	samples: [] as Sample[],
}));
for (const probe of probes) {
	const { body } = await measure(probe.path);
	const payload = JSON.parse(body);
	if (probe.name === "export" && payload.data.length !== 20)
		throw new Error("Expected 20 exported profiles.");
	if (probe.name === "compare" && payload.data.profiles.length !== 3)
		throw new Error("Expected three compared profiles.");
	if (probe.name === "search" && !payload.data.length)
		throw new Error("Expected search results.");
	if (probe.name === "health" && payload.publicationStatus !== "published")
		throw new Error("Catalog release is unavailable.");
}
for (let round = 0; round < rounds; round++) {
	await Promise.all(
		probes.map(async (probe) => {
			const { duration, bytes } = await measure(probe.path);
			probe.samples.push({ duration, bytes });
		}),
	);
}
function percentile(samples: Sample[], p: number) {
	const times = samples
		.map(({ duration }) => duration)
		.sort((left, right) => left - right);
	return Math.round(times[Math.ceil(p * times.length) - 1]);
}
console.log(
	JSON.stringify(
		{
			rounds,
			initialPageMs: Math.round(navigation.duration),
			provinceBoundaries: provinceIds.length,
			endpoints: Object.fromEntries(
				probes.map(({ name, samples }) => [
					name,
					{
						p50Ms: percentile(samples, 0.5),
						p95Ms: percentile(samples, 0.95),
						bytes: samples[0].bytes,
					},
				]),
			),
		},
		null,
		2,
	),
);
const failures = probes.filter(
	(probe) => percentile(probe.samples, 0.95) > budgets[probe.name],
);
const byteFailures = probes.filter(
	(probe) => probe.samples[0].bytes > byteBudgets[probe.name],
);
if (failures.length || byteFailures.length) {
	console.error(
		JSON.stringify({
			event: "performance_budget_exceeded",
			latencyEndpoints: failures.map(({ name }) => name),
			payloadEndpoints: byteFailures.map(({ name }) => name),
		}),
	);
	process.exitCode = 1;
}
if (navigation.duration > 5000) {
	console.error(
		JSON.stringify({
			event: "performance_budget_exceeded",
			endpoints: ["home"],
		}),
	);
	process.exitCode = 1;
}
