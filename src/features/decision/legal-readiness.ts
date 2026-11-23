import { spreadsheetCsvCell } from "../../lib/csv";
import type { Locale } from "../../lib/i18n/locale";
import { safeSourceUrl } from "../../lib/source-url";
import type { SectorId } from "./model";

export type LegalReferenceStatus =
	| "pending_review"
	| "effective"
	| "partially_effective"
	| "expired"
	| "repealed";

export type RequirementReviewStatus =
	| "to_verify"
	| "needs_specialist_review"
	| "verified_by_counsel"
	| "retired";

export type LegalReadinessItem = {
	id: string;
	code: string;
	sector: SectorId;
	geoId: string | null;
	investorType: string;
	channel: "online" | "offline" | "both";
	displayOrder: number;
	title: { vi: string; en: string };
	checklistItem: { vi: string; en: string };
	advisoryNote: { vi: string; en: string } | null;
	reviewStatus: Exclude<RequirementReviewStatus, "retired">;
	reference: {
		documentCode: string;
		title: { vi: string; en: string };
		issuingAuthority: { vi: string; en: string };
		issuedOn: string;
		effectiveFrom: string;
		effectiveTo: string | null;
		officialUrl: string;
		status: Exclude<LegalReferenceStatus, "repealed">;
	};
};

export type LegalChecklistBySector = Record<SectorId, LegalReadinessItem[]>;

export const LAW_INVESTMENT_2020 = {
	documentCode: "61/2020/QH14",
	title: {
		vi: "Luật Đầu tư 2020",
		en: "Law on Investment 2020",
	},
	issuingAuthority: {
		vi: "Quốc hội Việt Nam",
		en: "National Assembly of Vietnam",
	},
	issuedOn: "2020-06-17",
	effectiveFrom: "2021-01-01",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=143072",
	status: "effective" as const,
};

export const LAW_ENTERPRISES_2020 = {
	documentCode: "59/2020/QH14",
	title: {
		vi: "Luật Doanh nghiệp 2020",
		en: "Law on Enterprises 2020",
	},
	issuingAuthority: {
		vi: "Quốc hội Việt Nam",
		en: "National Assembly of Vietnam",
	},
	issuedOn: "2020-06-17",
	effectiveFrom: "2021-01-01",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=143069",
	status: "effective" as const,
};

const DECREE_31_2021 = {
	documentCode: "31/2021/NĐ-CP",
	title: {
		vi: "Nghị định 31/2021/NĐ-CP hướng dẫn Luật Đầu tư",
		en: "Decree 31/2021/ND-CP guiding the Law on Investment",
	},
	issuingAuthority: {
		vi: "Chính phủ Việt Nam",
		en: "Government of Vietnam",
	},
	issuedOn: "2021-03-26",
	effectiveFrom: "2021-03-26",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=147463",
	status: "effective" as const,
};

const DECREE_09_2018 = {
	documentCode: "09/2018/NĐ-CP",
	title: {
		vi: "Nghị định 09/2018/NĐ-CP về hoạt động mua bán hàng hóa của nhà đầu tư nước ngoài",
		en: "Decree 09/2018/ND-CP on goods trading and retail outlets by foreign-invested enterprises",
	},
	issuingAuthority: {
		vi: "Chính phủ Việt Nam",
		en: "Government of Vietnam",
	},
	issuedOn: "2018-01-15",
	effectiveFrom: "2018-01-15",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=127514",
	status: "effective" as const,
};

const DECREE_35_2022 = {
	documentCode: "35/2022/NĐ-CP",
	title: {
		vi: "Nghị định 35/2022/NĐ-CP về quản lý khu công nghiệp và khu kinh tế",
		en: "Decree 35/2022/ND-CP on management of industrial parks and economic zones",
	},
	issuingAuthority: {
		vi: "Chính phủ Việt Nam",
		en: "Government of Vietnam",
	},
	issuedOn: "2022-05-28",
	effectiveFrom: "2022-07-15",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=154572",
	status: "effective" as const,
};

const LAW_ENVIRONMENT_2020 = {
	documentCode: "72/2020/QH14",
	title: {
		vi: "Luật Bảo vệ môi trường 2020",
		en: "Law on Environmental Protection 2020",
	},
	issuingAuthority: {
		vi: "Quốc hội Việt Nam",
		en: "National Assembly of Vietnam",
	},
	issuedOn: "2020-11-17",
	effectiveFrom: "2022-01-01",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=145764",
	status: "effective" as const,
};

const LABOR_CODE_2019 = {
	documentCode: "45/2019/QH14",
	title: {
		vi: "Bộ luật Lao động 2019",
		en: "Labor Code 2019",
	},
	issuingAuthority: {
		vi: "Quốc hội Việt Nam",
		en: "National Assembly of Vietnam",
	},
	issuedOn: "2019-11-20",
	effectiveFrom: "2021-01-01",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=139256",
	status: "effective" as const,
};

const DECREE_163_2017 = {
	documentCode: "163/2017/NĐ-CP",
	title: {
		vi: "Nghị định 163/2017/NĐ-CP về kinh doanh dịch vụ logistics",
		en: "Decree 163/2017/ND-CP on logistics service business conditions",
	},
	issuingAuthority: {
		vi: "Chính phủ Việt Nam",
		en: "Government of Vietnam",
	},
	issuedOn: "2017-12-30",
	effectiveFrom: "2018-02-20",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=127147",
	status: "effective" as const,
};

const LAW_CUSTOMS_2014 = {
	documentCode: "54/2014/QH13",
	title: {
		vi: "Luật Hải quan 2014",
		en: "Law on Customs 2014",
	},
	issuingAuthority: {
		vi: "Quốc hội Việt Nam",
		en: "National Assembly of Vietnam",
	},
	issuedOn: "2014-06-23",
	effectiveFrom: "2015-01-01",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=36877",
	status: "effective" as const,
};

const DECREE_13_2023 = {
	documentCode: "13/2023/NĐ-CP",
	title: {
		vi: "Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân",
		en: "Decree 13/2023/ND-CP on personal data protection",
	},
	issuingAuthority: {
		vi: "Chính phủ Việt Nam",
		en: "Government of Vietnam",
	},
	issuedOn: "2023-04-17",
	effectiveFrom: "2023-07-01",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=160146",
	status: "effective" as const,
};

const LAW_CYBERSECURITY_2018 = {
	documentCode: "24/2018/QH14",
	title: {
		vi: "Luật An ninh mạng 2018",
		en: "Law on Cybersecurity 2018",
	},
	issuingAuthority: {
		vi: "Quốc hội Việt Nam",
		en: "National Assembly of Vietnam",
	},
	issuedOn: "2018-06-12",
	effectiveFrom: "2019-01-01",
	effectiveTo: null,
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=130198",
	status: "effective" as const,
};

export const canonicalLegalReferences = [
	LAW_INVESTMENT_2020,
	LAW_ENTERPRISES_2020,
	DECREE_31_2021,
	DECREE_09_2018,
	DECREE_35_2022,
	LAW_ENVIRONMENT_2020,
	LABOR_CODE_2019,
	DECREE_163_2017,
	LAW_CUSTOMS_2014,
	DECREE_13_2023,
	LAW_CYBERSECURITY_2018,
] as const;

export const defaultLegalChecklistBySector: LegalChecklistBySector = {
	retail: [
		{
			id: "retail-scope-model",
			code: "RETAIL_SCOPE_MODEL",
			sector: "retail",
			geoId: null,
			investorType: "foreign_investor",
			channel: "both",
			displayOrder: 1,
			title: {
				vi: "Phạm vi ngành bán lẻ và tiếp cận thị trường",
				en: "Retail scope and market-access conditions",
			},
			checklistItem: {
				vi: "Xác định hoạt động bán lẻ, phân khúc khách hàng và mô hình vận hành.",
				en: "Define the retail activity, customer segment and operating model.",
			},
			advisoryNote: {
				vi: "Đối chiếu mã ngành VSIC/CPC và danh mục ngành nghề tiếp cận thị trường có điều kiện đối với nhà đầu tư nước ngoài.",
				en: "Cross-check VSIC/CPC codes against Vietnam's conditional market-access list for foreign investors.",
			},
			reviewStatus: "to_verify",
			reference: DECREE_31_2021,
		},
		{
			id: "retail-irc-erc",
			code: "RETAIL_IRC_ERC",
			sector: "retail",
			geoId: null,
			investorType: "foreign_investor",
			channel: "both",
			displayOrder: 2,
			title: {
				vi: "Giấy chứng nhận đầu tư (IRC) và đăng ký doanh nghiệp (ERC)",
				en: "Investment registration (IRC) and enterprise registration (ERC)",
			},
			checklistItem: {
				vi: "Kiểm tra yêu cầu về đầu tư, đăng ký kinh doanh và tỷ lệ sở hữu của nhà đầu tư.",
				en: "Verify investment, business registration and ownership requirements for the investor.",
			},
			advisoryNote: {
				vi: "Xác nhận cơ quan cấp phép (Sở Kế hoạch và Đầu tư hoặc Ban Quản lý KCN/KKT) theo địa bàn đã chọn.",
				en: "Confirm licensing authority (DPI or Industrial Park Management Board) for the selected provinces.",
			},
			reviewStatus: "needs_specialist_review",
			reference: LAW_INVESTMENT_2020,
		},
		{
			id: "retail-trading-ent",
			code: "RETAIL_TRADING_ENT",
			sector: "retail",
			geoId: null,
			investorType: "foreign_investor",
			channel: "offline",
			displayOrder: 3,
			title: {
				vi: "Giấy phép kinh doanh bán lẻ & kiểm tra nhu cầu kinh tế (ENT)",
				en: "Retail trading license and Economic Needs Test (ENT)",
			},
			checklistItem: {
				vi: "Kiểm tra điều kiện cấp Giấy phép kinh doanh, lập cơ sở bán lẻ và quy định ENT với Sở Công Thương.",
				en: "Check trading license, retail outlet establishment and ENT applicability with the Department of Industry and Trade.",
			},
			advisoryNote: {
				vi: "Cơ sở bán lẻ thứ hai trở đi ngoài trung tâm thương mại có thể thuộc diện thẩm định ENT tùy quy mô diện tích và loại hàng hóa.",
				en: "Second and subsequent retail outlets outside shopping malls may require an Economic Needs Test depending on size and goods.",
			},
			reviewStatus: "needs_specialist_review",
			reference: DECREE_09_2018,
		},
		{
			id: "retail-tax-labor-product",
			code: "RETAIL_TAX_LABOR_PRODUCT",
			sector: "retail",
			geoId: null,
			investorType: "foreign_investor",
			channel: "both",
			displayOrder: 4,
			title: {
				vi: "Nghĩa vụ doanh nghiệp, thuế, lao động và hàng hóa chuyên ngành",
				en: "Corporate governance, tax, employment and product compliance",
			},
			checklistItem: {
				vi: "Xác nhận nghĩa vụ thuế, lao động, ghi nhãn và giấy phép riêng của sản phẩm với chuyên gia tư vấn.",
				en: "Confirm tax, employment, labelling and product-specific obligations with qualified advisers.",
			},
			advisoryNote: {
				vi: "Kiểm tra thêm giấy phép chuyên ngành nếu phân phối thực phẩm, mỹ phẩm, dược phẩm hoặc hàng hóa chịu điều kiện riêng.",
				en: "Verify sector-specific permits when distributing food, cosmetics, pharmaceuticals or regulated goods.",
			},
			reviewStatus: "to_verify",
			reference: LAW_ENTERPRISES_2020,
		},
	],
	manufacturing: [
		{
			id: "mfg-irc-incentives",
			code: "MFG_IRC_INCENTIVES",
			sector: "manufacturing",
			geoId: null,
			investorType: "foreign_investor",
			channel: "offline",
			displayOrder: 1,
			title: {
				vi: "Chủ trương đầu tư, IRC và địa bàn ưu đãi đầu tư",
				en: "Investment policy approval, IRC and incentive zones",
			},
			checklistItem: {
				vi: "Xác định dự án sản xuất có thuộc diện chấp thuận chủ trương đầu tư và kiểm tra điều kiện cấp IRC.",
				en: "Check whether the manufacturing project requires investment policy approval and confirm IRC conditions.",
			},
			advisoryNote: {
				vi: "Ưu đãi thuế/đất đai phụ thuộc cả ngành nghề khuyến khích và danh mục địa bàn ưu đãi theo phụ lục Nghị định 31/2021/NĐ-CP.",
				en: "Tax and land incentives depend on both encouraged sectors and geographical incentive lists under Decree 31/2021/ND-CP.",
			},
			reviewStatus: "needs_specialist_review",
			reference: LAW_INVESTMENT_2020,
		},
		{
			id: "mfg-ip-land",
			code: "MFG_IP_LAND",
			sector: "manufacturing",
			geoId: null,
			investorType: "foreign_investor",
			channel: "offline",
			displayOrder: 2,
			title: {
				vi: "Thuê đất khu công nghiệp, quy hoạch ngành và PCCC",
				en: "Industrial park land sublease, sector zoning and fire safety",
			},
			checklistItem: {
				vi: "Xác nhận ngành sản xuất phù hợp ngành thu hút của KCN, thời hạn thuê lại đất và giấy phép xây dựng/PCCC.",
				en: "Verify sector compatibility with the target industrial park, sublease term, construction and fire-safety permits.",
			},
			advisoryNote: {
				vi: "Làm việc trực tiếp với Ban Quản lý KCN tỉnh và chủ đầu tư hạ tầng về quy hoạch phân khu và đấu nối hạ tầng.",
				en: "Confirm zoning and utility connections directly with the provincial Industrial Park Management Board and park developer.",
			},
			reviewStatus: "to_verify",
			reference: DECREE_35_2022,
		},
		{
			id: "mfg-environment",
			code: "MFG_ENVIRONMENT",
			sector: "manufacturing",
			geoId: null,
			investorType: "foreign_investor",
			channel: "offline",
			displayOrder: 3,
			title: {
				vi: "Đánh giá tác động môi trường (ĐTM) và Giấy phép môi trường",
				en: "Environmental Impact Assessment (EIA) and Environmental Permit",
			},
			checklistItem: {
				vi: "Phân loại nhóm dự án môi trường để xác định yêu cầu lập ĐTM hoặc Giấy phép môi trường trước khi vận hành.",
				en: "Classify the project's environmental risk group to determine EIA or Environmental Permit obligations prior to operation.",
			},
			advisoryNote: {
				vi: "Thẩm quyền thẩm định (Bộ TN&MT hay UBND tỉnh) phụ thuộc nhóm dự án và lưu lượng phát thải.",
				en: "Approving authority (MONRE vs provincial People's Committee) depends on project risk classification and discharge volume.",
			},
			reviewStatus: "needs_specialist_review",
			reference: LAW_ENVIRONMENT_2020,
		},
		{
			id: "mfg-labor-workpermit",
			code: "MFG_LABOR_WORKPERMIT",
			sector: "manufacturing",
			geoId: null,
			investorType: "foreign_investor",
			channel: "offline",
			displayOrder: 4,
			title: {
				vi: "Lao động địa phương, an toàn vệ sinh lao động và chuyên gia nước ngoài",
				en: "Local employment, occupational safety and foreign work permits",
			},
			checklistItem: {
				vi: "Rà soát quy định hợp đồng lao động, BHXH, an toàn lao động và giấy phép lao động cho chuyên gia nước ngoài.",
				en: "Review employment contracts, social insurance, occupational safety and work-permit quotas for foreign specialists.",
			},
			advisoryNote: {
				vi: "Nhu cầu sử dụng lao động nước ngoài phải giải trình trước với cơ quan lao động địa phương.",
				en: "Demand for foreign personnel requires prior explanation and approval from local labour authorities.",
			},
			reviewStatus: "to_verify",
			reference: LABOR_CODE_2019,
		},
	],
	logistics: [
		{
			id: "log-business-conditions",
			code: "LOG_BUSINESS_CONDITIONS",
			sector: "logistics",
			geoId: null,
			investorType: "foreign_investor",
			channel: "both",
			displayOrder: 1,
			title: {
				vi: "Điều kiện kinh doanh dịch vụ logistics và tỷ lệ sở hữu nước ngoài",
				en: "Logistics business conditions and foreign equity caps",
			},
			checklistItem: {
				vi: "Đối chiếu từng phân nhóm dịch vụ logistics (vận tải biển, đường bộ, kho bãi, đại lý) với trần sở hữu nước ngoài.",
				en: "Check each logistics sub-service (maritime, road freight, warehousing, agency) against foreign ownership limits.",
			},
			advisoryNote: {
				vi: "Một số phân nhóm như vận tải đường bộ hoặc dịch vụ hỗ trợ vận tải biển yêu cầu liên doanh hoặc giới hạn tỷ lệ góp vốn theo cam kết WTO/FTA.",
				en: "Several sub-services (e.g., road transport, maritime auxiliary services) require joint ventures or equity caps under WTO/FTA commitments.",
			},
			reviewStatus: "needs_specialist_review",
			reference: DECREE_163_2017,
		},
		{
			id: "log-irc-land-warehouse",
			code: "LOG_IRC_LAND_WAREHOUSE",
			sector: "logistics",
			geoId: null,
			investorType: "foreign_investor",
			channel: "offline",
			displayOrder: 2,
			title: {
				vi: "Chấp thuận đầu tư kho bãi, ICD và quy hoạch hạ tầng kết nối",
				en: "Warehouse/ICD investment licensing and transport zoning",
			},
			checklistItem: {
				vi: "Kiểm tra điều kiện cấp IRC, mục đích sử dụng đất thương mại/kho bãi và kết nối giao thông cấp tỉnh.",
				en: "Verify IRC conditions, commercial/warehousing land-use zoning and provincial transport corridor connectivity.",
			},
			advisoryNote: {
				vi: "Phân biệt rõ quyền thuê lại đất trong KCN/KKT với thuê đất ngoài KCN cho trung tâm phân phối và ICD.",
				en: "Distinguish land-use rights inside industrial/economic zones versus outside zones for distribution centers and ICDs.",
			},
			reviewStatus: "to_verify",
			reference: LAW_INVESTMENT_2020,
		},
		{
			id: "log-customs-bonded",
			code: "LOG_CUSTOMS_BONDED",
			sector: "logistics",
			geoId: null,
			investorType: "foreign_investor",
			channel: "offline",
			displayOrder: 3,
			title: {
				vi: "Thủ tục hải quan, kho ngoại quan và đại lý làm thủ tục hải quan",
				en: "Customs procedures, bonded warehouses and customs brokerage",
			},
			checklistItem: {
				vi: "Xác nhận điều kiện thành lập kho ngoại quan/địa điểm thu gom hàng lẻ (CFS) và đăng ký đại lý hải quan.",
				en: "Confirm eligibility to operate bonded warehouses/CFS facilities and customs brokerage registration requirements.",
			},
			advisoryNote: {
				vi: "Kho ngoại quan và kho CFS cần đáp ứng diện tích tối thiểu, phần mềm kết nối dữ liệu và camera giám sát với cơ quan Hải quan.",
				en: "Bonded and CFS warehouses must satisfy minimum area, customs IT integration and CCTV supervision requirements.",
			},
			reviewStatus: "needs_specialist_review",
			reference: LAW_CUSTOMS_2014,
		},
		{
			id: "log-entity-subpermits",
			code: "LOG_ENTITY_SUBPERMITS",
			sector: "logistics",
			geoId: null,
			investorType: "foreign_investor",
			channel: "both",
			displayOrder: 4,
			title: {
				vi: "Đăng ký doanh nghiệp và giấy phép kinh doanh vận tải chuyên ngành",
				en: "Enterprise registration and specialised transport permits",
			},
			checklistItem: {
				vi: "Hoàn tất ERC đúng mã ngành và rà soát giấy phép kinh doanh vận tải bằng xe ô tô/đường thủy/hàng không nếu trực tiếp khai thác.",
				en: "Align ERC business lines and check road/inland-waterway/air transport operator permits if operating fleets directly.",
			},
			advisoryNote: {
				vi: "Kiểm tra cả nghĩa vụ PCCC kho hàng, vận chuyển hàng nguy hiểm và bảo hiểm trách nhiệm nghề nghiệp.",
				en: "Include warehouse fire-safety certification, dangerous-goods transport rules and carrier liability insurance.",
			},
			reviewStatus: "to_verify",
			reference: LAW_ENTERPRISES_2020,
		},
	],
	enterprise: [
		{
			id: "ent-market-access",
			code: "ENT_MARKET_ACCESS",
			sector: "enterprise",
			geoId: null,
			investorType: "foreign_investor",
			channel: "both",
			displayOrder: 1,
			title: {
				vi: "Tiếp cận thị trường cho dịch vụ CNTT, phần mềm và dịch vụ doanh nghiệp",
				en: "Market access for IT, software and enterprise services",
			},
			checklistItem: {
				vi: "Kiểm tra phạm vi dịch vụ công nghệ/tư vấn có thuộc ngành mở cửa 100% vốn nước ngoài hay có điều kiện riêng.",
				en: "Verify whether the proposed technology/consulting services permit 100% foreign ownership or carry sector conditions.",
			},
			advisoryNote: {
				vi: "Dịch vụ viễn thông có/không có hạ tầng mạng, trung gian thanh toán hoặc sàn TMĐT có điều kiện riêng ngoài dịch vụ phần mềm thuần túy.",
				en: "Telecom services, payment intermediaries and e-commerce marketplaces carry distinct licensing rules beyond pure software services.",
			},
			reviewStatus: "to_verify",
			reference: LAW_INVESTMENT_2020,
		},
		{
			id: "ent-irc-erc-office",
			code: "ENT_IRC_ERC_OFFICE",
			sector: "enterprise",
			geoId: null,
			investorType: "foreign_investor",
			channel: "both",
			displayOrder: 2,
			title: {
				vi: "Thành lập pháp nhân (IRC/ERC) và trụ sở hợp pháp",
				en: "Legal entity setup (IRC/ERC) and compliant office address",
			},
			checklistItem: {
				vi: "Xác nhận loại hình doanh nghiệp (TNHH/CP), người đại diện theo pháp luật cư trú tại Việt Nam và địa điểm thuê văn phòng hợp lệ.",
				en: "Confirm corporate structure (LLC/JSC), Vietnam-resident legal representative and valid commercial office lease.",
			},
			advisoryNote: {
				vi: "Địa chỉ trụ sở doanh nghiệp không được là căn hộ chung cư chỉ có chức năng để ở.",
				en: "Registered office addresses cannot be residential-only apartments.",
			},
			reviewStatus: "to_verify",
			reference: LAW_ENTERPRISES_2020,
		},
		{
			id: "ent-pdpd",
			code: "ENT_PDPD",
			sector: "enterprise",
			geoId: null,
			investorType: "foreign_investor",
			channel: "online",
			displayOrder: 3,
			title: {
				vi: "Bảo vệ dữ liệu cá nhân và hồ sơ đánh giá tác động (DPIA / TIA)",
				en: "Personal data protection and impact assessments (DPIA / TIA)",
			},
			checklistItem: {
				vi: "Rà soát nghĩa vụ lập hồ sơ đánh giá tác động xử lý dữ liệu cá nhân và chuyển dữ liệu cá nhân ra nước ngoài.",
				en: "Assess obligations to prepare and submit Personal Data Processing (DPIA) and Cross-Border Transfer (TIA) dossiers.",
			},
			advisoryNote: {
				vi: "Cần xác định rõ vai trò Bên kiểm soát dữ liệu / Bên xử lý dữ liệu và thời hạn nộp hồ sơ với cơ quan chuyên trách.",
				en: "Clarify Data Controller vs Data Processor roles and filing deadlines with the competent authority.",
			},
			reviewStatus: "needs_specialist_review",
			reference: DECREE_13_2023,
		},
		{
			id: "ent-cybersecurity",
			code: "ENT_CYBERSECURITY",
			sector: "enterprise",
			geoId: null,
			investorType: "foreign_investor",
			channel: "online",
			displayOrder: 4,
			title: {
				vi: "An ninh mạng, lưu trữ dữ liệu và tuân thủ dịch vụ số",
				en: "Cybersecurity, data localization and digital service compliance",
			},
			checklistItem: {
				vi: "Kiểm tra nghĩa vụ an toàn hệ thống thông tin và quy định lưu trữ dữ liệu tại Việt Nam nếu cung cấp dịch vụ trực tuyến.",
				en: "Review information-system security obligations and local data-storage triggers for online/cloud services.",
			},
			advisoryNote: {
				vi: "Tham vấn luật sư chuyên ngành công nghệ về ngưỡng áp dụng lưu trữ dữ liệu và hiện diện thương mại.",
				en: "Consult technology counsel on triggers for local data storage and commercial presence.",
			},
			reviewStatus: "needs_specialist_review",
			reference: LAW_CYBERSECURITY_2018,
		},
	],
};

export type ReadinessSummary = {
	completedCount: number;
	totalCount: number;
	completionPercent: number;
	counselReferenceRecorded: boolean;
	advisoryOutcome:
		| "not_started_to_verify"
		| "in_progress_to_verify"
		| "prepared_requires_specialist_verification"
		| "counsel_reference_recorded_advisory_only";
	/** Always false: this advisory tool never certifies legal eligibility or approval. */
	investmentEligibilityCertified: false;
};

export function summarizeLegalReadiness(
	items: readonly LegalReadinessItem[],
	checkedIds: readonly string[],
	counselReference?: string,
): ReadinessSummary {
	const itemIds = new Set(items.map((item) => item.id));
	const completedCount = checkedIds.filter((id) => itemIds.has(id)).length;
	const totalCount = items.length;
	const completionPercent =
		totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
	const counselReferenceRecorded = Boolean(counselReference?.trim());

	let advisoryOutcome: ReadinessSummary["advisoryOutcome"] =
		"not_started_to_verify";
	if (completedCount === 0) {
		advisoryOutcome = "not_started_to_verify";
	} else if (completedCount < totalCount) {
		advisoryOutcome = "in_progress_to_verify";
	} else if (counselReferenceRecorded) {
		advisoryOutcome = "counsel_reference_recorded_advisory_only";
	} else {
		advisoryOutcome = "prepared_requires_specialist_verification";
	}

	return {
		completedCount,
		totalCount,
		completionPercent,
		counselReferenceRecorded,
		advisoryOutcome,
		investmentEligibilityCertified: false,
	};
}

export type LegalReadinessExportPayload = {
	advisoryOnly: true;
	investmentEligibilityCertified: false;
	eligibilityNotice: string;
	generatedAt: string;
	locale: Locale;
	sector: SectorId;
	sectorLabel: string;
	selectedProvinces: Array<{ id: string; name: string }>;
	counselReference: string | null;
	summary: ReadinessSummary;
	items: Array<{
		code: string;
		title: string;
		checklistItem: string;
		completed: boolean;
		reviewStatus: LegalReadinessItem["reviewStatus"];
		channel: LegalReadinessItem["channel"];
		investorType: string;
		documentCode: string;
		documentTitle: string;
		issuingAuthority: string;
		issuedOn: string;
		effectiveFrom: string;
		effectiveTo: string | null;
		referenceStatus: LegalReadinessItem["reference"]["status"];
		officialUrl: string;
		advisoryNote: string | null;
	}>;
};

export function buildLegalReadinessExport(input: {
	sector: SectorId;
	sectorLabel: string;
	locale: Locale;
	items: readonly LegalReadinessItem[];
	checkedIds: readonly string[];
	selectedProvinces: Array<{ id: string; name: string }>;
	counselReference?: string;
	generatedAt?: Date;
}): LegalReadinessExportPayload {
	const checkedSet = new Set(input.checkedIds);
	const trimmedCounsel = input.counselReference?.trim() || null;
	const summary = summarizeLegalReadiness(
		input.items,
		input.checkedIds,
		trimmedCounsel ?? undefined,
	);
	const pick = (pair: { vi: string; en: string }) =>
		input.locale === "vi" ? pair.vi : pair.en;

	return {
		advisoryOnly: true,
		investmentEligibilityCertified: false,
		eligibilityNotice:
			input.locale === "vi"
				? "Chỉ mang tính chất tham khảo chuẩn bị hồ sơ; không phải ý kiến pháp lý và không xác nhận đủ điều kiện hay được chấp thuận đầu tư nếu chưa có xác minh của chuyên gia/cơ quan có thẩm quyền."
				: "Advisory planning checklist only; not legal advice and does not certify investment eligibility or approval without documented expert and authority verification.",
		generatedAt: (input.generatedAt ?? new Date()).toISOString(),
		locale: input.locale,
		sector: input.sector,
		sectorLabel: input.sectorLabel,
		selectedProvinces: input.selectedProvinces,
		counselReference: trimmedCounsel,
		summary,
		items: input.items.map((item) => ({
			code: item.code,
			title: pick(item.title),
			checklistItem: pick(item.checklistItem),
			completed: checkedSet.has(item.id),
			reviewStatus: item.reviewStatus,
			channel: item.channel,
			investorType: item.investorType,
			documentCode: item.reference.documentCode,
			documentTitle: pick(item.reference.title),
			issuingAuthority: pick(item.reference.issuingAuthority),
			issuedOn: item.reference.issuedOn,
			effectiveFrom: item.reference.effectiveFrom,
			effectiveTo: item.reference.effectiveTo,
			referenceStatus: item.reference.status,
			officialUrl: safeSourceUrl(item.reference.officialUrl) ?? "",
			advisoryNote: item.advisoryNote ? pick(item.advisoryNote) : null,
		})),
	};
}

export function legalReadinessToCsv(
	payload: LegalReadinessExportPayload,
): string {
	const header = [
		"sector",
		"provinces",
		"generated_at",
		"advisory_only",
		"eligibility_certified",
		"advisory_outcome",
		"counsel_reference",
		"requirement_code",
		"title",
		"checklist_item",
		"completed",
		"review_status",
		"channel",
		"document_code",
		"document_title",
		"issuing_authority",
		"effective_from",
		"reference_status",
		"official_url",
		"advisory_note",
	];
	const provinceNames = payload.selectedProvinces
		.map((province) => province.name)
		.join("; ");
	const rows = payload.items.map((item) => [
		payload.sectorLabel,
		provinceNames,
		payload.generatedAt,
		"true",
		"false",
		payload.summary.advisoryOutcome,
		payload.counselReference ?? "",
		item.code,
		item.title,
		item.checklistItem,
		item.completed ? "yes" : "no",
		item.reviewStatus,
		item.channel,
		item.documentCode,
		item.documentTitle,
		item.issuingAuthority,
		item.effectiveFrom,
		item.referenceStatus,
		item.officialUrl,
		item.advisoryNote ?? "",
	]);
	const lines = [
		header.map((cell) => spreadsheetCsvCell(cell)).join(","),
		...rows.map((row) => row.map((cell) => spreadsheetCsvCell(cell)).join(",")),
	];
	return `\uFEFF${lines.join("\r\n")}\r\n`;
}
