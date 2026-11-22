import { z } from "zod";
import { error, json } from "../../../lib/http";
import { searchPublicGeographies } from "../../../features/geography/catalog";
import { boundedQuery, observeApi } from "../../../lib/api-operations";

const optionalFiniteNumber = z
	.string()
	.trim()
	.refine(
		(value) => value === "" || Number.isFinite(Number(value)),
		"Numeric filter must be a valid number.",
	)
	.transform((value) => (value === "" ? undefined : Number(value)));

const querySchema = z
	.object({
		q: z.string().trim().max(120).optional(),
		level: z.enum(["country", "province", "commune"]).optional(),
		indicator: z
			.string()
			.trim()
			.regex(/^[A-Z][A-Z0-9_]{1,40}$/, "Invalid indicator code.")
			.optional(),
		period: z.string().trim().min(1).max(32).optional(),
		quality: z.enum(["verified", "supported"]).optional(),
		min: optionalFiniteNumber.optional(),
		max: optionalFiniteNumber.optional(),
	})
	.superRefine((value, ctx) => {
		const hasNumericBound =
			value.min !== undefined ||
			value.max !== undefined ||
			value.period !== undefined ||
			value.quality !== undefined;
		const hasQuery = Boolean(value.q && value.q.length >= 2);
		if (value.q !== undefined && value.q.length > 0 && value.q.length < 2) {
			ctx.addIssue({
				code: "custom",
				message: "Search query must be at least 2 characters.",
			});
			return;
		}
		if (!hasQuery && !(value.indicator && hasNumericBound)) {
			ctx.addIssue({
				code: "custom",
				message: "Search query must be at least 2 characters.",
			});
			return;
		}
		if (hasNumericBound && !value.indicator) {
			ctx.addIssue({
				code: "custom",
				message: "An indicator code is required for numeric filters.",
			});
			return;
		}
		if (
			value.min !== undefined &&
			value.max !== undefined &&
			value.min > value.max
		) {
			ctx.addIssue({
				code: "custom",
				message: "Minimum filter value cannot exceed maximum filter value.",
			});
		}
	});

export function GET(request: Request) {
	return observeApi("search", request, () => search(request));
}

async function search(request: Request) {
	const params = boundedQuery(
		request,
		"q",
		"level",
		"indicator",
		"period",
		"quality",
		"min",
		"max",
	);
	if (!params) return error("Invalid search parameters.", 400);
	const parsed = querySchema.safeParse({
		q: params.get("q") ?? undefined,
		level: params.get("level") ?? undefined,
		indicator: params.get("indicator") ?? undefined,
		period: params.get("period") ?? undefined,
		quality: params.get("quality") ?? undefined,
		min: params.get("min") ?? undefined,
		max: params.get("max") ?? undefined,
	});
	if (!parsed.success)
		return error(
			parsed.error.issues[0]?.message ?? "Invalid search query.",
			400,
		);

	const result = await searchPublicGeographies({
		query: parsed.data.q,
		level: parsed.data.level,
		indicator: parsed.data.indicator,
		period: parsed.data.period,
		quality: parsed.data.quality,
		min: parsed.data.min,
		max: parsed.data.max,
	});
	if (result.mode === "unavailable")
		return error("The geography catalog is temporarily unavailable.", 503);
	return json({
		data: result.geographies,
		meta: {
			query: (parsed.data.q ?? "").toLowerCase(),
			level: parsed.data.level ?? null,
			indicator: parsed.data.indicator ?? null,
			period: parsed.data.period ?? null,
			quality: parsed.data.quality ?? null,
			min: parsed.data.min ?? null,
			max: parsed.data.max ?? null,
			numericFilter: result.numericFilter ?? null,
			dataStatus: result.mode,
			dataset: result.dataset ?? null,
		},
	});
}
