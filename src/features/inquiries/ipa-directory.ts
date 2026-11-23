import type { SectorId } from "../decision/model";

export type IpaContactItem = {
	code: string;
	provinceCode: string | null;
	provinceName: string;
	sector: SectorId | null;
	organization: { vi: string; en: string };
	department: { vi: string; en: string };
	publicEmail: string;
	officialUrl: string;
	routingPriority: number;
};

export const canonicalIpaContacts: readonly IpaContactItem[] = [
	{
		code: "IPA-HANOI-HPA",
		provinceCode: "01",
		provinceName: "Hà Nội",
		sector: null,
		organization: {
			vi: "Trung tâm Xúc tiến Đầu tư, Thương mại, Du lịch TP. Hà Nội (HPA) & BQL Khu CNC Hòa Lạc",
			en: "Hanoi Promotion Agency (HPA) & Hoa Lac High-Tech Park Management Board",
		},
		department: {
			vi: "Bộ phận Xúc tiến Đầu tư FDI & Hỗ trợ Doanh nghiệp",
			en: "FDI Promotion & Investor Support Desk",
		},
		publicEmail: "hpa@hanoi.gov.vn",
		officialUrl: "https://hpa.hanoi.gov.vn/",
		routingPriority: 10,
	},
	{
		code: "IPA-HAIPHONG-HEZA",
		provinceCode: "31",
		provinceName: "Hải Phòng",
		sector: null,
		organization: {
			vi: "Ban Quản lý Khu kinh tế Hải Phòng (HEZA)",
			en: "Hai Phong Economic Zone Authority (HEZA)",
		},
		department: {
			vi: "Bộ phận Một cửa Đầu tư KCN & KKT Đình Vũ – Cát Hải",
			en: "One-Stop Investment Service — Industrial & Economic Zones",
		},
		publicEmail: "heza@haiphong.gov.vn",
		officialUrl: "https://heza.gov.vn/",
		routingPriority: 10,
	},
	{
		code: "IPA-BACNINH-BIZA",
		provinceCode: "24",
		provinceName: "Bắc Ninh",
		sector: "manufacturing",
		organization: {
			vi: "Ban Quản lý các Khu công nghiệp Bắc Ninh (BIZA) & Sở KH&ĐT Bắc Ninh",
			en: "Bac Ninh Industrial Zones Authority (BIZA) & DPI Bac Ninh",
		},
		department: {
			vi: "Phòng Quản lý Đầu tư Công nghiệp & Điện tử",
			en: "Industrial & Electronics FDI Division",
		},
		publicEmail: "bqlkcn@bacninh.gov.vn",
		officialUrl: "https://bqlkcn.bacninh.gov.vn/",
		routingPriority: 10,
	},
	{
		code: "IPA-DANANG-IPA",
		provinceCode: "48",
		provinceName: "Đà Nẵng",
		sector: null,
		organization: {
			vi: "Ban Xúc tiến và Hỗ trợ Đầu tư Đà Nẵng (IPA Da Nang) & BQL Khu CNC",
			en: "Da Nang Investment Promotion Agency (IPA Da Nang) & High-Tech Park Authority",
		},
		department: {
			vi: "Phòng Hỗ trợ Đầu tư & Khu Thương mại Tự do",
			en: "Investor Facilitation & Free Trade Zone Desk",
		},
		publicEmail: "ipa@danang.gov.vn",
		officialUrl: "https://investdanang.gov.vn/",
		routingPriority: 10,
	},
	{
		code: "IPA-DONGNAI-DIZA",
		provinceCode: "75",
		provinceName: "Đồng Nai",
		sector: null,
		organization: {
			vi: "Ban Quản lý các Khu công nghiệp Đồng Nai (DIZA)",
			en: "Dong Nai Industrial Zones Authority (DIZA)",
		},
		department: {
			vi: "Phòng Đầu tư Hạ tầng & Công nghiệp",
			en: "Industrial Park & Logistics Investment Division",
		},
		publicEmail: "diza@dongnai.gov.vn",
		officialUrl: "https://diza.dongnai.gov.vn/",
		routingPriority: 10,
	},
	{
		code: "IPA-HCMC-ITPC-HEPZA",
		provinceCode: "79",
		provinceName: "TP. Hồ Chí Minh",
		sector: null,
		organization: {
			vi: "Trung tâm Xúc tiến Thương mại và Đầu tư TP.HCM (ITPC) & HEPZA",
			en: "HCMC Investment and Trade Promotion Centre (ITPC) & HEPZA",
		},
		department: {
			vi: "Tổ Tư vấn Xúc tiến Đầu tư Quốc tế",
			en: "International Investment Advisory Division",
		},
		publicEmail: "itpc@itpc.gov.vn",
		officialUrl: "https://itpc.hochiminhcity.gov.vn/",
		routingPriority: 10,
	},
	{
		code: "IPA-NATIONAL-FIA",
		provinceCode: null,
		provinceName: "Toàn quốc / National",
		sector: null,
		organization: {
			vi: "Cục Đầu tư Nước ngoài (FIA) – Cổng Thông tin Đầu tư Quốc gia",
			en: "Foreign Investment Agency (FIA) – National Investment Portal",
		},
		department: {
			vi: "Trung tâm Xúc tiến Đầu tư phía Bắc / Trung / Nam",
			en: "National & Regional Investment Promotion Centers",
		},
		publicEmail: "fia@mpi.gov.vn",
		officialUrl: "https://vietnaminvest.gov.vn/",
		routingPriority: 100,
	},
];

export function resolveIpaContactsForInquiry(options: {
	provinceCodes?: readonly string[];
	provinceNames?: readonly string[];
	sector?: SectorId | string | null;
}): IpaContactItem[] {
	const codeSet = new Set(options.provinceCodes ?? []);
	const normalizedNames = (options.provinceNames ?? []).map((name) =>
		name.toLocaleLowerCase(),
	);

	const provincialMatches = canonicalIpaContacts.filter((item) => {
		if (!item.provinceCode) return false;
		if (codeSet.has(item.provinceCode)) return true;
		const lowerProv = item.provinceName.toLocaleLowerCase();
		return normalizedNames.some(
			(candidate) =>
				candidate.includes(lowerProv) || lowerProv.includes(candidate),
		);
	});

	const nationalFallback = canonicalIpaContacts.filter(
		(item) => item.provinceCode === null,
	);
	const combined =
		provincialMatches.length > 0
			? [...provincialMatches, ...nationalFallback]
			: [...nationalFallback];

	return combined.sort(
		(left, right) => left.routingPriority - right.routingPriority,
	);
}
