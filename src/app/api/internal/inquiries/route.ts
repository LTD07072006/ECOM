import { z } from "zod";
import { releaseRole } from "../../../../features/releases/authorization";
import { countInquiryReportRows, inquiryReportRows, inquiryAnalytics, listInquiries } from "../../../../features/inquiries/repository";
import { inquiryRowsCsv } from "../../../../features/inquiries/reporting";
import { inquiryStatuses } from "../../../../features/inquiries/validation";
import { boundedQuery, observeApi } from "../../../../lib/api-operations";
import { csvDownload, error, json } from "../../../../lib/http";

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
  return observeApi("internal", request, async () => {
    if (releaseRole(request) !== "steward") return error("A valid steward access token is required.", 401);
    const params = boundedQuery(request, "status", "country", "sector", "reference", "limit", "from", "to", "format", "page", "pageSize", "geographyIds");
    if (!params) return error("Unexpected inquiry parameters.", 400);
    const parsed = querySchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) return error("Invalid inquiry filters.", 400);
    const geographyIds = parsed.data.geographyIds?.split(",").map((value) => value.trim()).filter(Boolean);
    if (geographyIds?.some((value) => !/^[0-9a-f-]{36}$/i.test(value))) return error("Invalid geography filters.", 400);
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
    const [rows, total] = await Promise.all([
      listInquiries(filters),
      countInquiryReportRows(filters),
    ]);
    if (new URL(request.url).searchParams.get("format") === "csv") {
      const reportRows = await inquiryReportRows({ ...filters, page: undefined, pageSize: undefined });
      return csvDownload(inquiryRowsCsv(reportRows), "investor-inquiries.csv");
    }
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const metrics = await inquiryAnalytics(filters);
    return json({ data: rows, pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 }, metrics });
  });
}
