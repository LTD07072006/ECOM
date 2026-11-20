import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import { z } from "zod";

const text = z.string().trim().min(1);
const code = z.string().regex(/^(VN|[0-9]{2}|[0-9]{5})$/);
export const dataset = z.object({
  file: z.string().regex(/^[\w.-]+\.json(?:\.gz)?$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  datasetCode: text,
  version: text,
  owner: text,
  dataAsOf: z.iso.date(),
  reviewedOn: z.iso.date(),
  reviewIntervalDays: z.number().int().positive(),
  source: z.object({
    id: z.uuid(),
    type: z.enum(["official", "manual"]).default("official"),
    publisher: text,
    title: text,
    url: z.url({ protocol: /^https$/ }),
    license: text,
    citation: text,
  }),
}).refine((entry) => entry.reviewedOn >= entry.dataAsOf, "Review date precedes the data reference date");

const manifestSchema = z.object({
  geography: z.object({
    code: text,
    name: text,
    effectiveFrom: z.iso.date(),
    provinces: z.number().int().positive(),
    communes: z.number().int().positive(),
  }),
  administration: dataset,
  boundaries: dataset,
  population: dataset,
});

const administrationSchema = z.array(z.object({
  code,
  name: text,
  parent: code.nullable(),
}));

const longitude = z.number().min(-180).max(180);
const latitude = z.number().min(-90).max(90);
const position = z.tuple([longitude, latitude]);
const ring = z.array(position).min(4).refine((points) => {
  const [firstX, firstY] = points[0];
  const [lastX, lastY] = points[points.length - 1];
  return firstX === lastX && firstY === lastY;
}, "Polygon rings must close");
const polygon = z.array(ring).min(1);
const boundarySchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(z.object({
    type: z.literal("Feature"),
    properties: z.object({ code }),
    geometry: z.discriminatedUnion("type", [
      z.object({ type: z.literal("Polygon"), coordinates: polygon }),
      z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(polygon).min(1) }),
    ]),
  })),
});

const populationSchema = z.object({
  year: z.number().int().min(2025).max(2100),
  method: text,
  limitations: text,
  values: z.array(z.object({ code, people: z.number().int().positive().max(150_000_000) })),
});

export type DatasetInput = z.infer<typeof dataset>;
export type Release = Awaited<ReturnType<typeof loadRelease>>;

export async function readDataset(path: string, entry: DatasetInput) {
  const bytes = await readFile(join(dirname(path), entry.file));
  if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256) {
    throw new Error(`SHA-256 mismatch for ${entry.file}`);
  }
  const data = entry.file.endsWith(".gz") ? gunzipSync(bytes, { maxOutputLength: 64 * 1024 * 1024 }) : bytes;
  return JSON.parse(data.toString("utf8")) as unknown;
}

export function requireCoverage(label: string, actual: string[], expected: Set<string>) {
  const unique = new Set(actual);
  if (actual.length !== unique.size || unique.size !== expected.size || actual.some((code) => !expected.has(code))) {
    throw new Error(`${label} contains duplicate, missing or unexpected administrative codes`);
  }
}

export async function loadRelease(path: string) {
  const manifest = manifestSchema.parse(JSON.parse(await readFile(path, "utf8")));
  const [adminData, boundaryData, populationData] = await Promise.all([
    readDataset(path, manifest.administration),
    readDataset(path, manifest.boundaries),
    readDataset(path, manifest.population),
  ]);
  const units = administrationSchema.parse(adminData);
  const boundaries = boundarySchema.parse(boundaryData).features;
  const population = populationSchema.parse(populationData);

  const country = units.find((unit) => unit.code === "VN");
  const provinces = units.filter((unit) => unit.code.length === 2 && unit.code !== "VN");
  const communes = units.filter((unit) => unit.code.length === 5);
  const provinceCodes = new Set(provinces.map((unit) => unit.code));
  if (!country || country.parent !== null || communes.length !== manifest.geography.communes
    || provinceCodes.size !== manifest.geography.provinces || new Set(units.map((unit) => unit.code)).size !== units.length
    || provinces.some((unit) => unit.parent !== "VN")
    || communes.some((unit) => !unit.parent || !provinceCodes.has(unit.parent))) {
    throw new Error("Administrative coverage, codes or parent hierarchy do not match the release");
  }
  requireCoverage("Province boundaries", boundaries.map((feature) => feature.properties.code), provinceCodes);
  requireCoverage("Population", population.values.map((value) => value.code), new Set(["VN", ...provinceCodes]));
  if (manifest.geography.effectiveFrom !== manifest.administration.dataAsOf
    || manifest.geography.effectiveFrom !== manifest.boundaries.dataAsOf
    || `${population.year}-12-31` !== manifest.population.dataAsOf) {
    throw new Error("The geography effective date or population reporting year does not match the dataset metadata");
  }
  return { manifest, country, provinces, communes, boundaries, population };
}
