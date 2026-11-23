import type { SectorId } from "./model";

export type OpportunityType =
	| "industrial_park"
	| "high_tech_park"
	| "logistics_hub"
	| "project";

export type OpportunityReadiness =
	| "early_stage"
	| "available"
	| "under_review"
	| "closed";

export type OpportunityLegalStatus =
	| "not_reviewed"
	| "source_recorded"
	| "needs_check"
	| "verified_separately";

export type InvestmentOpportunityItem = {
	id: string;
	code: string;
	provinceCode: string;
	provinceName: string;
	sector: SectorId;
	opportunityType: OpportunityType;
	title: { vi: string; en: string };
	description: { vi: string; en: string };
	totalAreaHa: number;
	availableAreaHa: number;
	occupancyPercent: number;
	investmentMinUsdM: number | null;
	investmentMaxUsdM: number | null;
	powerCapacityMw: number | null;
	wastewaterM3Day: number | null;
	readinessStatus: OpportunityReadiness;
	legalStatus: OpportunityLegalStatus;
	officialUrl: string;
};

export const canonicalInvestmentOpportunities: readonly InvestmentOpportunityItem[] =
	[
		{
			id: "opp-deepc-hp",
			code: "OPP_DEEPC_HP",
			provinceCode: "31",
			provinceName: "Hải Phòng",
			sector: "manufacturing",
			opportunityType: "industrial_park",
			title: {
				vi: "Tổ hợp KCN DEEP C Hải Phòng II & III (KKT Đình Vũ – Cát Hải)",
				en: "DEEP C Hai Phong II & III Industrial Zones (Dinh Vu – Cat Hai EZ)",
			},
			description: {
				vi: "Khu công nghiệp sinh thái giáp cảng nước sâu Lạch Huyện, ưu tiên công nghiệp điện tử, phụ tùng ô tô, năng lượng sạch và hóa chất công nghiệp.",
				en: "Eco-industrial zone adjacent to Lach Huyen deep-water port, prioritizing electronics, automotive components, clean energy, and industrial chemicals.",
			},
			totalAreaHa: 1165,
			availableAreaHa: 310,
			occupancyPercent: 73,
			investmentMinUsdM: 10,
			investmentMaxUsdM: 500,
			powerCapacityMw: 625,
			wastewaterM3Day: 22500,
			readinessStatus: "available",
			legalStatus: "source_recorded",
			officialUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
		{
			id: "opp-yp-vsip-bn",
			code: "OPP_YP_VSIP_BN",
			provinceCode: "24",
			provinceName: "Bắc Ninh",
			sector: "manufacturing",
			opportunityType: "industrial_park",
			title: {
				vi: "KCN Yên Phong II-C & VSIP Bắc Ninh II (Cụm công nghiệp bán dẫn & điện tử)",
				en: "Yen Phong II-C & VSIP Bac Ninh II (Semiconductor & Electronics Cluster)",
			},
			description: {
				vi: "Hạ tầng chuẩn quốc tế phục vụ chuỗi cung ứng điện tử chính xác, bán dẫn, thiết bị thông minh và nhà xưởng xây sẵn (RBF).",
				en: "International-grade serviced industrial plots and ready-built factories (RBF) serving precision electronics, semiconductors, and smart devices.",
			},
			totalAreaHa: 495,
			availableAreaHa: 145,
			occupancyPercent: 71,
			investmentMinUsdM: 5,
			investmentMaxUsdM: 350,
			powerCapacityMw: 240,
			wastewaterM3Day: 14000,
			readinessStatus: "available",
			legalStatus: "source_recorded",
			officialUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
		{
			id: "opp-hoalac-hn",
			code: "OPP_HOALAC_HN",
			provinceCode: "01",
			provinceName: "Hà Nội",
			sector: "enterprise",
			opportunityType: "high_tech_park",
			title: {
				vi: "Khu Công nghệ cao Hòa Lạc – Phân khu Phần mềm & R&D",
				en: "Hoa Lac High-Tech Park – Software, AI & R&D Sub-zone",
			},
			description: {
				vi: "Khu công nghệ cao quốc gia thu hút trung tâm R&D, thiết kế vi mạch, trung tâm dữ liệu (Data Center) và đào tạo công nghệ cao.",
				en: "National high-tech park targeting R&D centers, IC design, Tier-3/4 data centers, and advanced digital services.",
			},
			totalAreaHa: 1586,
			availableAreaHa: 480,
			occupancyPercent: 48,
			investmentMinUsdM: 2,
			investmentMaxUsdM: 250,
			powerCapacityMw: 320,
			wastewaterM3Day: 36000,
			readinessStatus: "available",
			legalStatus: "source_recorded",
			officialUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
		{
			id: "opp-dhtp-ftz-dn",
			code: "OPP_DHTP_FTZ_DN",
			provinceCode: "48",
			provinceName: "Đà Nẵng",
			sector: "logistics",
			opportunityType: "logistics_hub",
			title: {
				vi: "Khu Thương mại Tự do & Trung tâm Logistics Cảng Liên Chiểu – Đà Nẵng",
				en: "Da Nang Free Trade Zone & Lien Chieu Port Logistics Hub",
			},
			description: {
				vi: "Dự án trung tâm logistics, kho ngoại quan và dịch vụ hậu cần gắn liền cảng Liên Chiểu và Khu Công nghệ cao Đà Nẵng.",
				en: "Integrated port logistics, bonded warehousing, and high-value air-sea transshipment hub linked to Lien Chieu Port and Da Nang High-Tech Park.",
			},
			totalAreaHa: 420,
			availableAreaHa: 280,
			occupancyPercent: 33,
			investmentMinUsdM: 15,
			investmentMaxUsdM: 400,
			powerCapacityMw: 180,
			wastewaterM3Day: 12000,
			readinessStatus: "early_stage",
			legalStatus: "source_recorded",
			officialUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
		{
			id: "opp-amata-lt-dn",
			code: "OPP_AMATA_LT_DN",
			provinceCode: "75",
			provinceName: "Đồng Nai",
			sector: "logistics",
			opportunityType: "logistics_hub",
			title: {
				vi: "KCN Công nghệ cao Long Thành & Trung tâm Logistics vùng Sân bay Long Thành",
				en: "Amata Long Thanh High-Tech IP & Airport Logistics Corridor",
			},
			description: {
				vi: "Quỹ đất công nghiệp và kho vận thông minh kết nối trực tiếp cao tốc TP.HCM – Long Thành và cụm cảng Cái Mép – Thị Vải.",
				en: "High-tech manufacturing and smart warehousing plots directly connected to the HCMC–Long Thanh expressway and Cai Mep deep-water port cluster.",
			},
			totalAreaHa: 410,
			availableAreaHa: 135,
			occupancyPercent: 67,
			investmentMinUsdM: 8,
			investmentMaxUsdM: 300,
			powerCapacityMw: 160,
			wastewaterM3Day: 15000,
			readinessStatus: "available",
			legalStatus: "source_recorded",
			officialUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
		{
			id: "opp-shtp-retail-hcm",
			code: "OPP_SHTP_RETAIL_HCM",
			provinceCode: "79",
			provinceName: "TP. Hồ Chí Minh",
			sector: "retail",
			opportunityType: "project",
			title: {
				vi: "Tổ hợp Trung tâm Phân phối Thương mại & Chuỗi lạnh Đô thị TP.HCM",
				en: "HCMC Omnichannel Retail Distribution & Cold-Chain Fulfillment Hub",
			},
			description: {
				vi: "Hạ tầng trung tâm phân phối bán lẻ hiện đại, kho lạnh đạt chuẩn và trung tâm hoàn tất đơn hàng (fulfillment) phục vụ vùng đô thị phía Nam.",
				en: "Modern retail distribution, temperature-controlled cold chain, and e-commerce fulfillment hub serving the Southern metropolitan consumer market.",
			},
			totalAreaHa: 185,
			availableAreaHa: 60,
			occupancyPercent: 68,
			investmentMinUsdM: 5,
			investmentMaxUsdM: 150,
			powerCapacityMw: 110,
			wastewaterM3Day: 8500,
			readinessStatus: "available",
			legalStatus: "source_recorded",
			officialUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
	];

export function filterOpportunities(
	items: readonly InvestmentOpportunityItem[],
	options: {
		sector?: SectorId;
		provinceCodes?: readonly string[];
	},
): InvestmentOpportunityItem[] {
	const codeSet =
		options.provinceCodes && options.provinceCodes.length > 0
			? new Set(options.provinceCodes)
			: null;
	return items.filter((item) => {
		const sectorOk = !options.sector || item.sector === options.sector;
		const provinceOk = !codeSet || codeSet.has(item.provinceCode);
		return sectorOk && provinceOk;
	});
}
