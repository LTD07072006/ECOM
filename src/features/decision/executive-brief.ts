import type { Locale } from "../../lib/i18n/locale";
import type { Profile } from "../geography/types";
import { resolveIpaContactsForInquiry } from "../inquiries/ipa-directory";
import {
	canonicalInvestmentIncentives,
	matchIncentivesForSectorAndProvinces,
	type InvestmentIncentiveItem,
} from "./investment-incentives";
import {
	canonicalInvestmentOpportunities,
	filterOpportunities,
	type InvestmentOpportunityItem,
} from "./investment-opportunities";
import type { LegalReadinessItem } from "./legal-readiness";
import type {
	CriterionDefinition,
	Evidence,
	ScoringReason,
	SectorId,
} from "./model";

export function buildExecutiveBriefMarkdown(input: {
	locale: Locale;
	sector: SectorId;
	sectorLabel: string;
	targetSegment?: string;
	hypotheses?: string;
	criteria: readonly CriterionDefinition[];
	weights: readonly number[];
	profiles: readonly Profile[];
	evidence: Evidence;
	officialResult:
		| { ok: true; results: Array<{ id: string; name: string; score: number }> }
		| { ok: false; reasons: ScoringReason[] };
	whatIfResult?:
		| { ok: true; results: Array<{ id: string; name: string; score: number }> }
		| { ok: false; reasons: ScoringReason[] }
		| null;
	incentives?: readonly InvestmentIncentiveItem[];
	opportunities?: readonly InvestmentOpportunityItem[];
	legalChecklist?: readonly LegalReadinessItem[];
	generatedAt?: Date;
}): string {
	const isVi = input.locale === "vi";
	const pick = (pair: { vi: string; en: string }) => (isVi ? pair.vi : pair.en);
	const stamp = (input.generatedAt ?? new Date()).toISOString();
	const provinceCodes = input.profiles.map((p) => p.code);
	const provinceNames = input.profiles.map((p) => p.displayName);

	const matchedIncentives = matchIncentivesForSectorAndProvinces(
		input.incentives ?? canonicalInvestmentIncentives,
		input.sector,
		input.profiles.map((p) => ({
			id: p.id,
			code: p.code,
			displayName: p.displayName,
		})),
	);
	const matchedOpportunities = filterOpportunities(
		input.opportunities ?? canonicalInvestmentOpportunities,
		{
			sector: input.sector,
			provinceCodes,
		},
	);
	const ipaContacts = resolveIpaContactsForInquiry({
		provinceCodes,
		provinceNames,
		sector: input.sector,
	});

	const lines: string[] = [];
	lines.push(
		isVi
			? `# BÁO CÁO TÓM TẮT ĐIỀU HÀNH (EXECUTIVE LOCATION BRIEF) — ${input.sectorLabel.toUpperCase()}`
			: `# EXECUTIVE LOCATION BRIEF — ${input.sectorLabel.toUpperCase()}`,
	);
	lines.push(
		isVi
			? `- **Thời gian xuất:** ${stamp}\n- **Địa bàn so sánh:** ${provinceNames.join(", ") || "Chưa chọn"}\n- **Tính chất tài liệu:** Báo cáo phân tích bối cảnh thị trường & chuẩn bị hồ sơ (Không phải ý kiến pháp lý hoặc xác nhận đủ điều kiện đầu tư)`
			: `- **Generated at:** ${stamp}\n- **Compared provinces:** ${provinceNames.join(", ") || "None selected"}\n- **Document status:** Market-entry context & planning brief (Advisory only; does not certify legal eligibility or approval)`,
	);

	lines.push("");
	lines.push(
		isVi
			? "## 1. Giả định Nhà đầu tư & Phân khúc mục tiêu"
			: "## 1. Investor Assumptions & Target Segment",
	);
	lines.push(
		`- **${isVi ? "Phân khúc khách hàng mục tiêu" : "Target customer segment"}:** ${input.targetSegment?.trim() || (isVi ? "Chưa ghi nhận" : "Not specified")}`,
	);
	lines.push(
		`- **${isVi ? "Giả thuyết nghiên cứu" : "Research hypotheses"}:** ${input.hypotheses?.trim() || (isVi ? "Chưa ghi nhận" : "Not specified")}`,
	);

	lines.push("");
	lines.push(
		isVi
			? "## 2. Bảng So sánh Chỉ tiêu Thống kê Đã công bố"
			: "## 2. Published Provincial Indicator Comparison",
	);
	const headerCols = [
		isVi ? "Chỉ tiêu" : "Indicator",
		isVi ? "Đơn vị" : "Unit",
		isVi ? "Trọng số (%)" : "Weight (%)",
		...provinceNames,
	];
	lines.push(`| ${headerCols.join(" | ")} |`);
	lines.push(`| ${headerCols.map(() => "---").join(" | ")} |`);
	input.criteria.forEach((criterion, idx) => {
		const values = input.profiles.map((profile) => {
			const obs = profile.observations.find(
				(item) => item.indicator === criterion.code,
			);
			return obs?.value != null ? `${obs.value} (${obs.period})` : "—";
		});
		lines.push(
			`| ${criterion.label} | ${criterion.unit} | ${input.weights[idx] ?? 0}% | ${values.join(" | ")} |`,
		);
	});

	lines.push("");
	lines.push(
		isVi
			? "## 3. Kết quả Đánh giá Đa tiêu chí & Bằng chứng Nhu cầu (F04/F05)"
			: "## 3. Multi-Criteria Assessment & Customer Evidence (F04/F05)",
	);
	lines.push(
		`- **${isVi ? "Trạng thái bằng chứng nhu cầu (T04)" : "Customer needs evidence status (T04)"}:** ${input.evidence.status === "available" ? `${input.evidence.segment} (n=${input.evidence.sampleSize}, ${input.evidence.source})` : isVi ? "Chưa có nghiên cứu nhu cầu khách hàng được công bố" : "No published customer needs study available"}`,
	);
	if (input.officialResult.ok) {
		for (const item of input.officialResult.results) {
			lines.push(`- **${item.name}:** ${item.score.toFixed(2)} / 100`);
		}
	} else {
		lines.push(
			`- **${isVi ? "Điểm chính thức (T05)" : "Official score (T05)"}:** ${isVi ? "Từ chối chấm điểm chính thức do chưa đủ điều kiện dữ liệu/bằng chứng khảo sát" : "Official score refused due to missing required survey evidence or scoring eligibility"}`,
		);
	}
	if (input.whatIfResult?.ok) {
		lines.push(
			`- **${isVi ? "Xếp hạng What-if tham khảo (Không chính thức)" : "Exploratory What-if Ranking (Non-official)"}:** ${input.whatIfResult.results.map((r) => `${r.name}: ${r.score.toFixed(1)}/100`).join(" · ")}`,
		);
	}

	lines.push("");
	lines.push(
		isVi
			? "## 4. Khu công nghiệp & Dự án Kêu gọi Đầu tư tiêu biểu"
			: "## 4. Featured Industrial Parks & Investment Opportunities",
	);
	if (matchedOpportunities.length === 0) {
		lines.push(
			isVi
				? "- Chưa có dự án mẫu khớp trực tiếp với bộ tỉnh/ngành đã chọn."
				: "- No featured zone/project records match the current province/sector filter.",
		);
	} else {
		for (const opp of matchedOpportunities) {
			lines.push(
				`- **${pick(opp.title)} (${opp.provinceName})** — ${isVi ? "Diện tích trống" : "Available"}: ${opp.availableAreaHa}/${opp.totalAreaHa} ha (${isVi ? "Lấp đầy" : "Occupancy"}: ${opp.occupancyPercent}%) · ${isVi ? "Vốn mục tiêu" : "Target cap"}: $${opp.investmentMinUsdM ?? 0}M–$${opp.investmentMaxUsdM ?? 0}M`,
			);
		}
	}

	lines.push("");
	lines.push(
		isVi
			? "## 5. Khung Ưu đãi Đầu tư Tham khảo (Ngành × Địa bàn)"
			: "## 5. Advisory Investment Incentives (Sector × Location)",
	);
	for (const inc of matchedIncentives.incentives) {
		lines.push(
			`- **${pick(inc.title)} (${inc.reference.documentCode}):** ${pick(inc.headlineBenefit)}`,
		);
	}

	if (input.legalChecklist && input.legalChecklist.length > 0) {
		lines.push("");
		lines.push(
			isVi
				? "## 6. Danh mục Pháp lý Chuẩn bị Gia nhập Thị trường"
				: "## 6. Market-Entry Legal Readiness Checklist",
		);
		for (const item of input.legalChecklist) {
			lines.push(
				`- [ ] **${pick(item.title)}** (${item.reference.documentCode}, ${isVi ? "hiệu lực" : "effective"} ${item.reference.effectiveFrom}): ${pick(item.checklistItem)}`,
			);
		}
	}

	lines.push("");
	lines.push(
		isVi
			? "## 7. Đầu mối Xúc tiến Đầu tư Địa phương (IPA / Ban Quản lý KCN-KKT)"
			: "## 7. Recommended Provincial IPA & Industrial Zone Authorities",
	);
	for (const contact of ipaContacts) {
		lines.push(
			`- **${pick(contact.organization)} (${contact.provinceName}):** ${pick(contact.department)} · Email: ${contact.publicEmail} · ${contact.officialUrl}`,
		);
	}

	return `${lines.join("\n")}\n`;
}
