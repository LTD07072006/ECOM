export type ProjectTrack =
	| "manufacturing_in_ip"
	| "manufacturing_outside_ip"
	| "logistics"
	| "retail";

export type LocalizedText = {
	vi: string;
	en: string;
};

export type LicensingStep = {
	id: string;
	order: number;
	title: LocalizedText;
	authority: LocalizedText;
	statutoryWorkingDays: { min: number; max: number };
	requiredFor: ProjectTrack[];
	documents: { vi: string[]; en: string[] };
	legalBasis: string;
	notes: LocalizedText;
};

export const PROJECT_TRACK_OPTIONS: ReadonlyArray<{
	id: ProjectTrack;
	label: LocalizedText;
	summary: LocalizedText;
}> = [
	{
		id: "manufacturing_in_ip",
		label: {
			vi: "Sản xuất trong KCN / KCNC / KKT",
			en: "Manufacturing inside Industrial / Hi-Tech Park",
		},
		summary: {
			vi: "Hưởng quy trình một cửa qua Ban Quản lý KCN/KKT, không cần chấp thuận chủ trương (trừ dự án đặc biệt).",
			en: "One-stop processing via IP/EZ Management Board; usually skips Investment Policy Approval unless flagged as special-scale.",
		},
	},
	{
		id: "manufacturing_outside_ip",
		label: {
			vi: "Sản xuất ngoài KCN (thuê / giao đất trực tiếp)",
			en: "Manufacturing outside Industrial Park (direct land)",
		},
		summary: {
			vi: "Bắt buộc xin Chấp thuận chủ trương đầu tư cấp UBND tỉnh/Thủ tướng trước khi cấp IRC.",
			en: "Requires Investment Policy Approval from Provincial People's Committee or Prime Minister before IRC issuance.",
		},
	},
	{
		id: "logistics",
		label: {
			vi: "Kho vận, Trung tâm Logistics & Cold-Chain",
			en: "Warehousing, Logistics Hub & Cold-Chain",
		},
		summary: {
			vi: "Áp dụng lộ trình trong KCN/cảng, lưu ý điều kiện tiếp cận thị trường và thẩm duyệt PCCC kho cao tầng.",
			en: "Applies IP/port licensing flow with sector market-access checks and strict fire-safety design approval for high-bay racks.",
		},
	},
	{
		id: "retail",
		label: {
			vi: "Phân phối, Bán lẻ & Thương mại điện tử",
			en: "Retail Distribution & E-Commerce",
		},
		summary: {
			vi: "Không cần PCCC/Xây dựng cho trụ sở văn phòng; cần kiểm tra Giấy phép kinh doanh & lập cơ sở bán lẻ (ENT).",
			en: "Skips industrial construction/EIA permits for leased retail premises; verify Business License & Economic Needs Test (ENT).",
		},
	},
];

export const FDI_LICENSING_STEPS: readonly LicensingStep[] = [
	{
		id: "investment-policy-approval",
		order: 1,
		title: {
			vi: "Chấp thuận chủ trương đầu tư",
			en: "Investment Policy Approval",
		},
		authority: {
			vi: "UBND cấp tỉnh / Sở Kế hoạch & Đầu tư (hoặc Thủ tướng đối với dự án đặc biệt)",
			en: "Provincial People's Committee / DPI (or Prime Minister for special projects)",
		},
		statutoryWorkingDays: { min: 35, max: 45 },
		requiredFor: ["manufacturing_outside_ip"],
		documents: {
			vi: [
				"Văn bản đề nghị thực hiện dự án đầu tư",
				"Hồ sơ pháp lý & báo cáo tài chính 2 năm gần nhất của nhà đầu tư",
				"Đề xuất nhu cầu sử dụng đất, giải trình công nghệ & đánh giá sơ bộ tác động môi trường",
			],
			en: [
				"Written request for investment project implementation",
				"Investor legal profile & audited financial statements for the last 2 years",
				"Land-use demand proposal, technology explanation & preliminary environmental assessment",
			],
		},
		legalBasis: "Law on Investment 2020 (Art. 31–36), Decree 31/2021/ND-CP",
		notes: {
			vi: "Dự án trong KCN/KCNC/KKT phù hợp quy hoạch thường được miễn bước này.",
			en: "Projects inside planned Industrial, Hi-Tech, or Economic Zones are generally exempt from this step.",
		},
	},
	{
		id: "irc",
		order: 2,
		title: {
			vi: "Cấp Giấy chứng nhận đăng ký đầu tư (IRC)",
			en: "Investment Registration Certificate (IRC)",
		},
		authority: {
			vi: "Ban Quản lý KCN/KKT (trong KCN) hoặc Sở KH&ĐT / Sở Tài chính (ngoài KCN)",
			en: "IP/EZ Management Board (inside IP) or Provincial DPI / Dept. of Finance (outside IP)",
		},
		statutoryWorkingDays: { min: 15, max: 15 },
		requiredFor: [
			"manufacturing_in_ip",
			"manufacturing_outside_ip",
			"logistics",
			"retail",
		],
		documents: {
			vi: [
				"Đề xuất dự án đầu tư & chứng minh năng lực tài chính (số dư ngân hàng / cam kết vốn)",
				"Thỏa thuận nguyên tắc thuê đất KCN hoặc hợp đồng thuê địa điểm dự án",
				"Bản sao hộ chiếu / giấy ĐKKD của nhà đầu tư nước ngoài đã hợp pháp hóa lãnh sự",
			],
			en: [
				"Investment project proposal & financial capacity proof (bank balance / credit letter)",
				"Memorandum of Understanding / land lease agreement in IP or premises lease",
				"Consularized passport or Certificate of Incorporation of the foreign investor",
			],
		},
		legalBasis: "Law on Investment 2020 (Art. 38)",
		notes: {
			vi: "Trường hợp thuộc diện chấp thuận chủ trương, IRC được cấp trong 5 ngày làm việc sau quyết định chủ trương.",
			en: "If subject to Investment Policy Approval, IRC is issued within 5 working days after that approval.",
		},
	},
	{
		id: "erc",
		order: 3,
		title: {
			vi: "Cấp Giấy chứng nhận đăng ký doanh nghiệp (ERC)",
			en: "Enterprise Registration Certificate (ERC)",
		},
		authority: {
			vi: "Phòng Đăng ký kinh doanh – Cổng thông tin quốc gia về ĐKDN",
			en: "Business Registration Office – National Business Registration Portal",
		},
		statutoryWorkingDays: { min: 3, max: 5 },
		requiredFor: [
			"manufacturing_in_ip",
			"manufacturing_outside_ip",
			"logistics",
			"retail",
		],
		documents: {
			vi: [
				"Giấy đề nghị đăng ký doanh nghiệp & Điều lệ công ty",
				"Danh sách thành viên / cổ đông sáng lập & người đại diện theo pháp luật cư trú tại VN",
				"Bản sao IRC đã được cấp",
			],
			en: [
				"Enterprise registration application & Company Charter",
				"List of members/shareholders & Vietnam-resident legal representative info",
				"Copy of the issued IRC",
			],
		},
		legalBasis: "Law on Enterprises 2020 (Art. 26)",
		notes: {
			vi: "Hoàn thành khắc dấu pháp nhân, mở tài khoản vốn đầu tư trực tiếp (DICA) và góp vốn trong 90 ngày kể từ ngày cấp ERC.",
			en: "Complete corporate seal, open Direct Investment Capital Account (DICA), and inject charter capital within 90 days.",
		},
	},
	{
		id: "eia-env-permit",
		order: 4,
		title: {
			vi: "Đánh giá tác động môi trường (ĐTM) / Giấy phép môi trường",
			en: "Environmental Impact Assessment (EIA) / Environmental Permit",
		},
		authority: {
			vi: "Sở Tài nguyên & Môi trường / Ban Quản lý KCN được ủy quyền (hoặc Bộ TN&MT cho nhóm I)",
			en: "Provincial DONRE / Delegated IP Board (or MONRE for Group I projects)",
		},
		statutoryWorkingDays: { min: 30, max: 45 },
		requiredFor: [
			"manufacturing_in_ip",
			"manufacturing_outside_ip",
			"logistics",
		],
		documents: {
			vi: [
				"Báo cáo ĐTM hoặc hồ sơ đề xuất cấp Giấy phép môi trường theo phân nhóm I/II/III",
				"Thuyết minh dây chuyền sản xuất, công suất xả thải & đấu nối hệ thống xử lý nước thải tập trung KCN",
			],
			en: [
				"EIA report or Environmental Permit dossier per Group I/II/III classification",
				"Process flow, effluent volume calculation & IP centralized wastewater tie-in agreement",
			],
		},
		legalBasis: "Law on Environmental Protection 2020, Decree 08/2022/ND-CP",
		notes: {
			vi: "Cơ sở bán lẻ/văn phòng không phát sinh khí thải/nước thải công nghiệp được miễn bước này.",
			en: "Retail outlets and administrative offices without industrial effluent/emissions are exempt.",
		},
	},
	{
		id: "fire-safety",
		order: 5,
		title: {
			vi: "Thẩm duyệt thiết kế Phòng cháy chữa cháy (PCCC)",
			en: "Fire Prevention & Fighting (FPT) Design Appraisal",
		},
		authority: {
			vi: "Phòng Cảnh sát PCCC & CNCH Công an cấp tỉnh (hoặc Cục C07 cho công trình đặc biệt)",
			en: "Provincial Fire & Rescue Police Department (or C07 for special-grade facilities)",
		},
		statutoryWorkingDays: { min: 10, max: 15 },
		requiredFor: [
			"manufacturing_in_ip",
			"manufacturing_outside_ip",
			"logistics",
		],
		documents: {
			vi: [
				"Hồ sơ thiết kế kỹ thuật hệ thống PCCC, khoảng cách an toàn, lối thoát nạn & bể nước chữa cháy",
				"Văn bản góp ý quy hoạch/hạ tầng cấp nước chữa cháy của chủ đầu tư KCN",
			],
			en: [
				"Technical drawings for sprinklers, fire separation distances, egress & fire water tanks",
				"Hydrant network & infrastructure confirmation from Industrial Park developer",
			],
		},
		legalBasis: "Decree 50/2024/ND-CP amending Decree 136/2020/ND-CP",
		notes: {
			vi: "Kho logistics cao tầng (>3.000 m² hoặc giá kệ cao) và nhà xưởng có dung môi/pin bắt buộc thẩm duyệt trước khi khởi công.",
			en: "High-bay warehouses (>3,000 sqm or tall racking) and plants with solvents/batteries require appraisal before construction.",
		},
	},
	{
		id: "construction-or-retail-license",
		order: 6,
		title: {
			vi: "Giấy phép xây dựng (hoặc Giấy phép kinh doanh / ENT cho bán lẻ)",
			en: "Construction Permit (or Retail Business License / ENT Check)",
		},
		authority: {
			vi: "Ban Quản lý KCN / Sở Xây dựng (Xây dựng) hoặc Sở Công Thương (Bán lẻ)",
			en: "IP Board / Dept. of Construction (Construction) or Dept. of Industry & Trade (Retail)",
		},
		statutoryWorkingDays: { min: 20, max: 30 },
		requiredFor: [
			"manufacturing_in_ip",
			"manufacturing_outside_ip",
			"logistics",
			"retail",
		],
		documents: {
			vi: [
				"Bản vẽ thiết kế bản vẽ thi công kèm kết quả thẩm duyệt PCCC & môi trường (nếu xây nhà máy)",
				"Hồ sơ cấp Giấy phép kinh doanh & giải trình nhu cầu kinh tế ENT nếu lập điểm bán lẻ thứ 2 trở đi > 500 m²",
			],
			en: [
				"Construction design drawings backed by FPT & EIA approvals (for new factory/warehouse build)",
				"Trading/Business License dossier & Economic Needs Test (ENT) review for 2nd+ retail outlet > 500 sqm",
			],
		},
		legalBasis:
			"Law on Construction 2014 (amended 2020); Decree 09/2018/ND-CP (Retail)",
		notes: {
			vi: "Thuê nhà xưởng xây sẵn (RBF) trong KCN đạt chuẩn có thể rút ngắn đáng kể thời gian thi công cải tạo nội thất.",
			en: "Leasing a pre-certified Ready-Built Factory (RBF) inside an IP avoids ground-up construction permit lead times.",
		},
	},
];

export type TimelineSummary = {
	totalSteps: number;
	completedSteps: number;
	progressPercent: number;
	totalMinDays: number;
	totalMaxDays: number;
	remainingMinDays: number;
	remainingMaxDays: number;
};

export function isValidProjectTrack(value: unknown): value is ProjectTrack {
	return (
		value === "manufacturing_in_ip" ||
		value === "manufacturing_outside_ip" ||
		value === "logistics" ||
		value === "retail"
	);
}

export function sanitizeCompletedByTrack(
	raw: unknown,
): Partial<Record<ProjectTrack, string[]>> {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return {};
	}
	const result: Partial<Record<ProjectTrack, string[]>> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		if (!isValidProjectTrack(key) || !Array.isArray(value)) continue;
		const validStepIds = new Set(
			getRoadmapForTrack(key).map((step) => step.id),
		);
		const deduped = [
			...new Set(
				value.filter(
					(item): item is string =>
						typeof item === "string" && validStepIds.has(item),
				),
			),
		];
		result[key] = deduped;
	}
	return result;
}

export function getRoadmapForTrack(track: ProjectTrack): LicensingStep[] {
	return FDI_LICENSING_STEPS.filter((step) => step.requiredFor.includes(track));
}

export function estimateTimelineSummary(
	track: ProjectTrack,
	completedIds: readonly string[],
): TimelineSummary {
	const steps = getRoadmapForTrack(track);
	const completedSet = new Set(completedIds);
	const totalSteps = steps.length;
	const completedList = steps.filter((step) => completedSet.has(step.id));
	const remainingList = steps.filter((step) => !completedSet.has(step.id));

	const completedSteps = completedList.length;
	const progressPercent =
		totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

	const sumDays = (
		items: readonly LicensingStep[],
		bound: "min" | "max",
	): number =>
		items.reduce((acc, item) => acc + item.statutoryWorkingDays[bound], 0);

	return {
		totalSteps,
		completedSteps,
		progressPercent,
		totalMinDays: sumDays(steps, "min"),
		totalMaxDays: sumDays(steps, "max"),
		remainingMinDays: sumDays(remainingList, "min"),
		remainingMaxDays: sumDays(remainingList, "max"),
	};
}
