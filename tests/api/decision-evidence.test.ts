import { afterEach, expect, spyOn, test } from "bun:test";
import { GET } from "../../src/app/api/decision/evidence/route";
import * as surveyRepo from "../../src/features/decision/survey-evidence-repository";

let spy: ReturnType<
	typeof spyOn<typeof surveyRepo, "loadPublishedSurveyStudies">
>;

afterEach(() => {
	spy?.mockRestore();
});

test("GET /api/decision/evidence returns explicit unavailable state when no survey is published (T04 absent)", async () => {
	spy = spyOn(surveyRepo, "loadPublishedSurveyStudies").mockResolvedValue([]);
	const response = await GET(
		new Request("http://localhost/api/decision/evidence?sector=retail"),
	);
	expect(response.status).toBe(200);
	const body = await response.json();
	expect(body.data).toEqual({
		status: "unavailable",
		reason: "no_published_survey",
		studies: [],
	});
});

test("GET /api/decision/evidence returns published survey metadata and aggregates (T04 present)", async () => {
	spy = spyOn(surveyRepo, "loadPublishedSurveyStudies").mockResolvedValue([
		{
			studyId: "20000000-0000-4000-8000-000000000001",
			code: "SURVEY-RETAIL-2025",
			sector: "retail",
			title: {
				vi: "Khảo sát nhu cầu bán lẻ 2025",
				en: "Retail Needs Study 2025",
			},
			segment: "Urban households",
			method: "Stratified CATI",
			sampleSize: 1200,
			periodStart: "2025-03-01",
			periodEnd: "2025-05-31",
			periodLabel: "Q2 2025",
			sourceName: "National Research Institute",
			sourceUrl: "https://nso.gov.vn/retail-study",
			isDemo: true,
			coveredGeoIds: ["10000000-0000-4000-8000-000000000002"],
			questions: [
				{
					questionId: "20000000-0000-4000-8000-000000000010",
					questionCode: "Q1_CHANNEL",
					prompt: {
						vi: "Kênh mua sắm ưu tiên",
						en: "Preferred retail channel",
					},
					responseType: "single_choice",
				},
			],
			aggregates: [
				{
					aggregateId: "20000000-0000-4000-8000-000000000020",
					questionId: "20000000-0000-4000-8000-000000000010",
					questionCode: "Q1_CHANNEL",
					geoId: "10000000-0000-4000-8000-000000000002",
					sampleSize: 600,
					optionLabel: "Modern trade",
					valuePercent: 64.5,
					valueNumeric: null,
					unit: "%",
					qualityStatus: "verified",
				},
			],
		},
	]);

	const response = await GET(
		new Request(
			"http://localhost/api/decision/evidence?sector=retail&geoIds=10000000-0000-4000-8000-000000000002",
		),
	);
	expect(response.status).toBe(200);
	const body = await response.json();
	expect(body.data.status).toBe("available");
	expect(body.data.studies[0]).toMatchObject({
		sampleSize: 1200,
		method: "Stratified CATI",
		periodStart: "2025-03-01",
		periodEnd: "2025-05-31",
		sourceName: "National Research Institute",
		isDemo: true,
	});
	expect(body.data.studies[0].questions[0].questionCode).toBe("Q1_CHANNEL");
});

test("GET /api/decision/evidence rejects invalid sectors or malformed UUIDs", async () => {
	expect(
		(
			await GET(
				new Request("http://localhost/api/decision/evidence?sector=unknown"),
			)
		).status,
	).toBe(400);
	expect(
		(
			await GET(
				new Request("http://localhost/api/decision/evidence?geoIds=not-a-uuid"),
			)
		).status,
	).toBe(400);
});
