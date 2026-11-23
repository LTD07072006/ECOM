import { z } from "zod";
import {
	createSurveyStudyRecord,
	listAllSurveyStudies,
	updateSurveyStudyStatus,
} from "../../../../features/decision/survey-evidence-repository";
import { releaseIdentity } from "../../../../features/releases/authorization";
import { boundedQuery, observeApi } from "../../../../lib/api-operations";
import { error, json, readBoundedJson } from "../../../../lib/http";
import { safeSourceUrl } from "../../../../lib/source-url";

export const dynamic = "force-dynamic";

const createStudySchema = z.object({
	code: z
		.string()
		.trim()
		.regex(/^[A-Z0-9_-]{3,48}$/, "Invalid study code."),
	sector: z.enum(["retail", "manufacturing", "logistics", "enterprise"]),
	titleVi: z.string().trim().min(3).max(200),
	titleEn: z.string().trim().min(3).max(200),
	segment: z.string().trim().min(2).max(160),
	method: z.string().trim().min(2).max(200),
	sampleSize: z.number().int().min(1).max(1_000_000),
	periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	periodLabel: z.string().trim().min(2).max(60),
	sourceName: z.string().trim().min(2).max(200),
	sourceUrl: z.string().trim().max(300).optional(),
	isDemo: z.boolean().default(true),
	publicationStatus: z.enum(["draft", "published", "retired"]).default("draft"),
	questionCode: z
		.string()
		.trim()
		.regex(/^[A-Z0-9_]{2,40}$/),
	promptVi: z.string().trim().min(3).max(300),
	promptEn: z.string().trim().min(3).max(300),
	aggregates: z
		.array(
			z.object({
				geoId: z.string().uuid(),
				sampleSize: z.number().int().min(1),
				optionLabel: z.string().trim().min(1).max(120),
				valuePercent: z.number().min(0).max(100),
			}),
		)
		.min(1)
		.max(34),
});

const patchStatusSchema = z.object({
	studyId: z.string().uuid(),
	publicationStatus: z.enum(["draft", "published", "retired"]),
});

export function GET(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity || identity.role !== "steward") {
				return error("A valid steward access token is required.", 401);
			}
			if (!boundedQuery(request)) {
				return error("Unexpected survey query parameters.", 400);
			}
			const studies = await listAllSurveyStudies();
			return json({ data: studies, meta: { count: studies.length } });
		},
		true,
	);
}

export function POST(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity || identity.role !== "steward") {
				return error("A valid steward access token is required.", 401);
			}
			if (!boundedQuery(request)) {
				return error("Unexpected survey query parameters.", 400);
			}
			const body = await readBoundedJson(request, 32_000);
			if (!body.ok) return error(body.message, body.status);
			const parsed = createStudySchema.safeParse(body.value);
			if (!parsed.success || parsed.data.periodEnd < parsed.data.periodStart) {
				return error("Invalid survey study payload.", 400);
			}
			if (parsed.data.sourceUrl && !safeSourceUrl(parsed.data.sourceUrl)) {
				return error("Survey sourceUrl must be a valid HTTPS URL.", 400);
			}
			const created = await createSurveyStudyRecord(parsed.data);
			if (!created) {
				return error("Unable to store survey study.", 503);
			}
			return json({ data: created }, { status: 201 });
		},
		true,
	);
}

export function PATCH(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity || identity.role !== "steward") {
				return error("A valid steward access token is required.", 401);
			}
			if (!boundedQuery(request)) {
				return error("Unexpected survey query parameters.", 400);
			}
			const body = await readBoundedJson(request, 4_096);
			if (!body.ok) return error(body.message, body.status);
			const parsed = patchStatusSchema.safeParse(body.value);
			if (!parsed.success) {
				return error("Invalid survey status update.", 400);
			}
			const updated = await updateSurveyStudyStatus(
				parsed.data.studyId,
				parsed.data.publicationStatus,
			);
			if (!updated) {
				return error("Survey study not found.", 404);
			}
			return json({ data: updated });
		},
		true,
	);
}
