import { databasePool } from "../../db/pool";
import { safeSourceUrl } from "../../lib/source-url";
import type { SectorId } from "./model";

export type PublishedSurveyAggregate = {
	aggregateId: string;
	questionId: string;
	questionCode: string;
	geoId: string;
	sampleSize: number;
	optionLabel: string;
	valuePercent: number | null;
	valueNumeric: number | null;
	unit: string;
	qualityStatus: "verified" | "supported" | "unavailable";
};

export type PublishedSurveyQuestion = {
	questionId: string;
	questionCode: string;
	prompt: { vi: string; en: string };
	responseType: string;
};

export type PublishedSurveyStudy = {
	studyId: string;
	code: string;
	sector: SectorId;
	title: { vi: string; en: string };
	segment: string;
	method: string;
	sampleSize: number;
	periodStart: string;
	periodEnd: string;
	periodLabel: string;
	sourceName: string;
	sourceUrl: string | null;
	isDemo: boolean;
	coveredGeoIds: string[];
	questions: PublishedSurveyQuestion[];
	aggregates: PublishedSurveyAggregate[];
};

type StudyRow = {
	study_id: string;
	code: string;
	sector: SectorId;
	title_vi: string;
	title_en: string;
	segment: string;
	method: string;
	sample_size: number;
	period_start: string;
	period_end: string;
	period_label: string;
	source_name: string;
	source_url: string | null;
	is_demo: boolean;
};

type QuestionRow = {
	question_id: string;
	study_id: string;
	question_code: string;
	prompt_vi: string;
	prompt_en: string;
	response_type: string;
};

type AggregateRow = {
	aggregate_id: string;
	study_id: string;
	question_id: string;
	question_code: string;
	geo_id: string;
	sample_size: number;
	option_label: string;
	value_percent: string | null;
	value_numeric: string | null;
	unit: string;
	quality_status: "verified" | "supported" | "unavailable";
};

export async function loadPublishedSurveyStudies(
	sector?: SectorId,
	geoIds?: string[],
): Promise<PublishedSurveyStudy[]> {
	try {
		const sql = databasePool();
		const studies = await sql<StudyRow[]>`
      select study_id, code, sector, title_vi, title_en, segment, method, sample_size,
        period_start::text, period_end::text, period_label, source_name, source_url, is_demo
      from market_entry.survey_studies
      where publication_status = 'published'
        and (${sector ?? null}::text is null or sector = ${sector ?? null})
      order by period_end desc, code asc
    `;
		if (studies.length === 0) return [];
		const studyIds = studies.map((study) => study.study_id);

		const [questions, aggregates] = await Promise.all([
			sql<QuestionRow[]>`
        select question_id, study_id, question_code, prompt_vi, prompt_en, response_type
        from market_entry.survey_questions
        where study_id = any(${studyIds}::uuid[])
        order by question_code asc
      `,
			sql<AggregateRow[]>`
        select a.aggregate_id, a.study_id, a.question_id, q.question_code, a.geo_id,
          a.sample_size, a.option_label, a.value_percent, a.value_numeric, a.unit, a.quality_status
        from market_entry.survey_aggregates as a
        join market_entry.survey_questions as q on q.question_id = a.question_id
        where a.study_id = any(${studyIds}::uuid[])
          and (${geoIds && geoIds.length > 0 ? geoIds : null}::uuid[] is null or a.geo_id = any(${geoIds && geoIds.length > 0 ? geoIds : null}::uuid[]))
        order by q.question_code asc, a.geo_id asc, a.option_label asc
      `,
		]);

		const questionsByStudy = new Map<string, PublishedSurveyQuestion[]>();
		for (const row of questions) {
			const list = questionsByStudy.get(row.study_id) ?? [];
			list.push({
				questionId: row.question_id,
				questionCode: row.question_code,
				prompt: { vi: row.prompt_vi, en: row.prompt_en },
				responseType: row.response_type,
			});
			questionsByStudy.set(row.study_id, list);
		}

		const aggregatesByStudy = new Map<string, PublishedSurveyAggregate[]>();
		for (const row of aggregates) {
			const list = aggregatesByStudy.get(row.study_id) ?? [];
			list.push({
				aggregateId: row.aggregate_id,
				questionId: row.question_id,
				questionCode: row.question_code,
				geoId: row.geo_id,
				sampleSize: row.sample_size,
				optionLabel: row.option_label,
				valuePercent:
					row.value_percent === null ? null : Number(row.value_percent),
				valueNumeric:
					row.value_numeric === null ? null : Number(row.value_numeric),
				unit: row.unit,
				qualityStatus: row.quality_status,
			});
			aggregatesByStudy.set(row.study_id, list);
		}

		return studies
			.map((study) => {
				const studyAggregates = aggregatesByStudy.get(study.study_id) ?? [];
				const coveredGeoIds = [
					...new Set(studyAggregates.map((item) => item.geoId)),
				];
				return {
					studyId: study.study_id,
					code: study.code,
					sector: study.sector,
					title: { vi: study.title_vi, en: study.title_en },
					segment: study.segment,
					method: study.method,
					sampleSize: study.sample_size,
					periodStart: study.period_start,
					periodEnd: study.period_end,
					periodLabel: study.period_label,
					sourceName: study.source_name,
					sourceUrl: study.source_url ? safeSourceUrl(study.source_url) : null,
					isDemo: study.is_demo,
					coveredGeoIds,
					questions: questionsByStudy.get(study.study_id) ?? [],
					aggregates: studyAggregates,
				};
			})
			.filter((study) =>
				geoIds && geoIds.length > 0
					? geoIds.every((id) => study.coveredGeoIds.includes(id))
					: true,
			);
	} catch {
		return [];
	}
}
