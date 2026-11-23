import { z } from "zod";
import {
	inquiryRowsCsvStream,
	MAX_INQUIRY_CSV_EXPORT_ROWS,
} from "../../../../features/inquiries/reporting";
import {
	countInquiryReportRows,
	inquiryAnalytics,
	inquiryReportRows,
	listInquiries,
	recordInquiryAccess,
} from "../../../../features/inquiries/repository";
import { inquiryStatuses } from "../../../../features/inquiries/validation";
import { releaseIdentity } from "../../../../features/releases/authorization";
import {
	boundedQuery,
	observeApi,
	uuidPattern,
} from "../../../../lib/api-operations";
import { error, json } from "../../../../lib/http";

export const dynamic = "force-dynamic";

const querySchema = z.object({
	status: z.enum(inquiryStatuses).optional(),
	country: z.string().trim().max(100).optional(),
	sector: z.string().trim().max(160).optional(),
	reference: z.string().trim().max(32).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
	page: z.coerce.number().int().min(1).optional(),
	pageSize: z.coerce.number().int().min(1).max(100).optional(),
	geographyIds: z.string().optional(),
});

export function GET(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity || identity.role !== "steward")
				return error("A valid steward access token is required.", 401);
			const params = boundedQuery(
				request,
				"status",
				"country",
				"sector",
				"reference",
				"limit",
				"from",
				"to",
				"format",
				"page",
				"pageSize",
				"geographyIds",
			);
			if (!params) return error("Unexpected inquiry parameters.", 400);
			const parsed = querySchema.safeParse(Object.fromEntries(params));
			if (!parsed.success) return error("Invalid inquiry filters.", 400);
			const geographyIds = parsed.data.geographyIds
				?.split(",")
				.map((value) => value.trim())
				.filter(Boolean);
			if (
				geographyIds &&
				(geographyIds.length > 20 ||
					geographyIds.some((value) => !uuidPattern.test(value)))
			)
				return error("Invalid geography filters.", 400);
			const filters = {
				status: parsed.data.status,
				country: parsed.data.country,
				sector: parsed.data.sector,
				referenceCode: parsed.data.reference,
				from: parsed.data.from,
				to: parsed.data.to,
				geographyIds,
				page: parsed.data.page,
				pageSize: parsed.data.pageSize ?? parsed.data.limit,
			};
			const format = params.get("format");
			if (format === "csv") {
				const exportFilters = {
					...filters,
					page: undefined,
					pageSize: undefined,
				};
				const totalExportRows = await countInquiryReportRows(exportFilters);
				if (totalExportRows > MAX_INQUIRY_CSV_EXPORT_ROWS) {
					return error(
						`Too many matching inquiries for CSV export (max ${MAX_INQUIRY_CSV_EXPORT_ROWS} rows). Narrow the date range or filters.`,
						413,
					);
				}
				await recordInquiryAccess({
					actor: identity.actor,
					action: "exported_live_csv",
					rowCount: totalExportRows,
				});
				const reportRows = await inquiryReportRows(
					exportFilters,
					MAX_INQUIRY_CSV_EXPORT_ROWS,
				);
				return new Response(inquiryRowsCsvStream(reportRows), {
					status: 200,
					headers: {
						"Content-Type": "text/csv; charset=utf-8",
						"Content-Disposition":
							'attachment; filename="investor-inquiries.csv"',
					},
				});
			}
			if (format !== null && format !== "") {
				return error("Invalid export format.", 400);
			}
			const [rows, total, metrics] = await Promise.all([
				listInquiries(filters),
				countInquiryReportRows(filters),
				inquiryAnalytics(filters),
			]);
			const page = filters.page ?? 1;
			const pageSize = filters.pageSize ?? 50;
			const totalPages = Math.max(Math.ceil(total / pageSize), 1);
			return json({
				data: rows,
				pagination: {
					page,
					pageSize,
					total,
					totalPages,
					hasNext: page < totalPages,
					hasPrevious: page > 1,
				},
				metrics,
			});
		},
		true,
	);
}
