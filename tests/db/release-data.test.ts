import { expect, test } from "bun:test";
import {
	copyFile,
	mkdtemp,
	readFile,
	rmdir,
	unlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { dataset, loadRelease } from "../../src/db/release-data";

const snapshot = "data/sprint1";
const manifest = join(snapshot, "manifest.json");

test("dataset metadata preserves raw-source fingerprints and rejects malformed hashes", async () => {
	const wave2 = JSON.parse(
		await readFile("data/sprint3/manifest.json", "utf8"),
	);
	const entry = wave2.series[0].dataset;
	expect(dataset.parse(entry)).toHaveProperty(
		"sourceSha256",
		entry.sourceSha256,
	);
	expect(dataset.parse(wave2.series.at(-1).dataset)).toHaveProperty(
		"sourceSha256",
		null,
	);
	expect(
		dataset.safeParse({ ...entry, sourceSha256: "not-a-sha256" }).success,
	).toBe(false);
});

test("the pinned release has matching official administrative, boundary, and population codes", async () => {
	const release = await loadRelease(manifest);
	expect(release.provinces).toHaveLength(34);
	expect(release.communes).toHaveLength(3321);
	expect(release.communes.find((unit) => unit.code === "00004")).toEqual({
		code: "00004",
		name: "Phường Ba Đình",
		parent: "01",
	});
	expect(release.boundaries).toHaveLength(34);
	expect(release.population.values).toHaveLength(35);
	expect(
		release.population.values.find((row) => row.code === "VN")?.people,
	).toBe(102345320);
});

test("validation rejects an edited snapshot and independently checks the administrative hierarchy", async () => {
	const destination = await mkdtemp(join(tmpdir(), "market-entry-validation-"));
	const files = [
		"manifest.json",
		"administration.json",
		"population-2025.json",
		"province-boundaries.json.gz",
	];
	try {
		await Promise.all(
			files.map((file) =>
				copyFile(join(snapshot, file), join(destination, file)),
			),
		);
		const changedManifest = join(destination, "manifest.json");
		const changedAdministration = join(destination, "administration.json");
		const geographies = JSON.parse(
			await readFile(changedAdministration, "utf8"),
		);
		geographies.find((geo: { code: string }) => geo.code === "00004").parent =
			"VN";
		const contents = JSON.stringify(geographies);
		await writeFile(changedAdministration, contents);
		await expect(loadRelease(changedManifest)).rejects.toThrow(
			"SHA-256 mismatch",
		);

		const metadata = JSON.parse(await readFile(changedManifest, "utf8"));
		metadata.administration.sha256 = createHash("sha256")
			.update(contents)
			.digest("hex");
		await writeFile(changedManifest, JSON.stringify(metadata));
		await expect(loadRelease(changedManifest)).rejects.toThrow(
			"parent hierarchy",
		);
	} finally {
		await Promise.all(
			files.map((file) =>
				unlink(join(destination, file)).catch(() => undefined),
			),
		);
		await rmdir(destination);
	}
});
