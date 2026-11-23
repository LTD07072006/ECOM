import type { SectorId } from "./model";

export type IncentiveZoneTier =
	| "special_difficult_area"
	| "difficult_area"
	| "economic_zone_hightech"
	| "industrial_park"
	| "sector_encouraged"
	| "standard";

export type IncentiveType =
	| "cit_rate_holiday"
	| "land_rent_exemption"
	| "import_duty_exemption"
	| "rd_accelerated_depreciation";

export type InvestmentIncentiveItem = {
	id: string;
	code: string;
	sector: SectorId | null;
	geoId: string | null;
	zoneTier: IncentiveZoneTier;
	incentiveType: IncentiveType;
	investorType: string;
	displayOrder: number;
	title: { vi: string; en: string };
	headlineBenefit: { vi: string; en: string };
	description: { vi: string; en: string };
	eligibilityNote: { vi: string; en: string };
	validFrom: string;
	validTo: string | null;
	reference: {
		documentCode: string;
		title: { vi: string; en: string };
		issuingAuthority: { vi: string; en: string };
		officialUrl: string;
	};
};

export type ProvinceIncentiveZoneProfile = {
	provinceId: string;
	provinceCode: string;
	provinceName: string;
	primaryZoneTier: IncentiveZoneTier;
	applicableTiers: IncentiveZoneTier[];
	keyZones: { vi: string; en: string };
	authorityNote: { vi: string; en: string };
};

const REF_LAW_INVESTMENT = {
	documentCode: "61/2020/QH14",
	title: {
		vi: "Luật Đầu tư 2020 (Điều 15–17)",
		en: "Law on Investment 2020 (Arts. 15–17)",
	},
	issuingAuthority: {
		vi: "Quốc hội Việt Nam",
		en: "National Assembly of Vietnam",
	},
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=143072",
};

const REF_DECREE_31 = {
	documentCode: "31/2021/NĐ-CP",
	title: {
		vi: "Nghị định 31/2021/NĐ-CP (Phụ lục II & III — Ngành và Địa bàn ưu đãi)",
		en: "Decree 31/2021/ND-CP (Appendices II & III — Incentive Sectors & Locations)",
	},
	issuingAuthority: { vi: "Chính phủ Việt Nam", en: "Government of Vietnam" },
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=147463",
};

const REF_DECREE_35 = {
	documentCode: "35/2022/NĐ-CP",
	title: {
		vi: "Nghị định 35/2022/NĐ-CP về quản lý Khu công nghiệp và Khu kinh tế",
		en: "Decree 35/2022/ND-CP on Industrial Parks and Economic Zones",
	},
	issuingAuthority: { vi: "Chính phủ Việt Nam", en: "Government of Vietnam" },
	officialUrl: "https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=154572",
};

export const canonicalInvestmentIncentives: readonly InvestmentIncentiveItem[] =
	[
		{
			id: "inc-ez-hightech-cit",
			code: "INC_EZ_HIGHTECH_CIT",
			sector: null,
			geoId: null,
			zoneTier: "economic_zone_hightech",
			incentiveType: "cit_rate_holiday",
			investorType: "foreign_investor",
			displayOrder: 1,
			title: {
				vi: "Ưu đãi thuế TNDN tại Khu kinh tế, Khu công nghệ cao & địa bàn đặc biệt khó khăn",
				en: "CIT incentive in Economic Zones, High-Tech Parks & specially difficult areas",
			},
			headlineBenefit: {
				vi: "Thuế suất TNDN 10% trong 15 năm · Miễn 4 năm, giảm 50% trong 9 năm tiếp theo",
				en: "10% CIT rate for 15 years · 4 years tax exemption + 9 years 50% reduction",
			},
			description: {
				vi: "Áp dụng cho dự án đầu tư mới thực hiện tại Khu kinh tế ven biển/cửa khẩu, Khu công nghệ cao hoặc địa bàn có điều kiện KT-XH đặc biệt khó khăn theo Phụ lục III Nghị định 31/2021/NĐ-CP.",
				en: "Applies to new investment projects located inside coastal/border Economic Zones, High-Tech Parks, or specially difficult socio-economic areas under Appendix III of Decree 31/2021/ND-CP.",
			},
			eligibilityNote: {
				vi: "Không áp dụng cho thu nhập từ thương mại/dịch vụ ngoài KKT hoặc dự án khai thác khoáng sản, kinh doanh BĐS thương mại.",
				en: "Excludes commercial trading revenue outside the zone, mineral extraction, and commercial real-estate development.",
			},
			validFrom: "2021-03-26",
			validTo: null,
			reference: REF_DECREE_31,
		},
		{
			id: "inc-ip-land-rent",
			code: "INC_IP_LAND_RENT",
			sector: "manufacturing",
			geoId: null,
			zoneTier: "industrial_park",
			incentiveType: "land_rent_exemption",
			investorType: "foreign_investor",
			displayOrder: 2,
			title: {
				vi: "Ưu đãi tiền thuê đất & hạ tầng đối với dự án sản xuất trong Khu công nghiệp",
				en: "Land-rent & infrastructure exemption for manufacturing in Industrial Parks",
			},
			headlineBenefit: {
				vi: "Miễn tiền thuê đất trong thời gian xây dựng cơ bản (tối đa 3 năm) + miễn từ 3 đến 15 năm theo địa bàn",
				en: "Land-rent exemption during construction (up to 3 years) + 3 to 15 years post-construction by zone tier",
			},
			description: {
				vi: "Dự án sản xuất công nghiệp, công nghiệp hỗ trợ đặt trong KCN được hưởng khung miễn/giảm tiền thuê đất và kết cấu hạ tầng dùng chung theo Nghị định 35/2022/NĐ-CP.",
				en: "Manufacturing and supporting-industry projects inside approved Industrial Parks qualify for land-rent and shared infrastructure exemptions under Decree 35/2022/ND-CP.",
			},
			eligibilityNote: {
				vi: "Nếu thuê lại đất đã có hạ tầng của chủ đầu tư KCN, mức ưu đãi được phản ánh qua giá thuê lại đất tùy theo chính sách ưu đãi chủ đầu tư hạ tầng được hưởng.",
				en: "When subleasing serviced land from an IP developer, land-rent exemptions depend on the master developer's underlying state land lease terms.",
			},
			validFrom: "2022-07-15",
			validTo: null,
			reference: REF_DECREE_35,
		},
		{
			id: "inc-mfg-import-duty",
			code: "INC_MFG_IMPORT_DUTY",
			sector: "manufacturing",
			geoId: null,
			zoneTier: "sector_encouraged",
			incentiveType: "import_duty_exemption",
			investorType: "foreign_investor",
			displayOrder: 3,
			title: {
				vi: "Miễn thuế nhập khẩu máy móc, thiết bị tạo tài sản cố định",
				en: "Import duty exemption on machinery & equipment forming fixed assets",
			},
			headlineBenefit: {
				vi: "Miễn 100% thuế nhập khẩu thiết bị, dây chuyền tạo tài sản cố định & nguyên liệu trong nước chưa sản xuất được (5 năm)",
				en: "100% import duty exemption on fixed-asset machinery & 5-year exemption on domestically unavailable raw materials",
			},
			description: {
				vi: "Áp dụng cho dự án thuộc ngành nghề ưu đãi đầu tư (công nghiệp hỗ trợ, điện tử, chế biến chế tạo công nghệ cao) hoặc địa bàn ưu đãi đầu tư theo Phụ lục II & III Nghị định 31/2021/NĐ-CP.",
				en: "Available to projects in encouraged manufacturing sectors (supporting industries, electronics, advanced manufacturing) or incentive locations under Appendices II & III of Decree 31/2021/ND-CP.",
			},
			eligibilityNote: {
				vi: "Phải đăng ký Danh mục hàng hóa nhập khẩu miễn thuế với cơ quan Hải quan trước khi làm thủ tục nhập khẩu lô hàng đầu tiên.",
				en: "Requires registering the Master Duty-Free Import List with Customs prior to importing the first shipment.",
			},
			validFrom: "2021-03-26",
			validTo: null,
			reference: REF_DECREE_31,
		},
		{
			id: "inc-logistics-corridor",
			code: "INC_LOGISTICS_CORRIDOR",
			sector: "logistics",
			geoId: null,
			zoneTier: "economic_zone_hightech",
			incentiveType: "cit_rate_holiday",
			investorType: "foreign_investor",
			displayOrder: 4,
			title: {
				vi: "Ưu đãi đầu tư hạ tầng cảng biển, trung tâm logistics & ICD trong Khu kinh tế",
				en: "Incentives for seaport terminals, logistics hubs & ICDs in Economic Zones",
			},
			headlineBenefit: {
				vi: "Thuế suất TNDN 10% (15 năm) cho đầu tư bến cảng/trung tâm logistics trong KKT; miễn thuế nhập khẩu thiết bị xếp dỡ chuyên dùng",
				en: "10% CIT (15 years) for port terminals & logistics centers inside Economic Zones; import duty relief on specialized handling equipment",
			},
			description: {
				vi: "Đầu tư xây dựng và kinh doanh bến cảng, cảng cạn (ICD) và trung tâm logistics quy mô lớn tại KKT ven biển/cửa khẩu thuộc danh mục ngành nghề ưu đãi đầu tư.",
				en: "Development and operation of port berths, ICDs, and major logistics centers inside coastal/border Economic Zones qualify as encouraged infrastructure projects.",
			},
			eligibilityNote: {
				vi: "Dự án kho bãi thông thường ngoài KKT và ngoài địa bàn khó khăn áp dụng thuế suất TNDN phổ thông (20%).",
				en: "Standard warehousing outside Economic Zones and non-incentive districts is subject to the standard 20% CIT rate.",
			},
			validFrom: "2021-01-01",
			validTo: null,
			reference: REF_LAW_INVESTMENT,
		},
		{
			id: "inc-enterprise-software-rd",
			code: "INC_ENTERPRISE_SOFTWARE_RD",
			sector: "enterprise",
			geoId: null,
			zoneTier: "sector_encouraged",
			incentiveType: "rd_accelerated_depreciation",
			investorType: "foreign_investor",
			displayOrder: 5,
			title: {
				vi: "Ưu đãi sản xuất phần mềm, trung tâm R&D, dữ liệu lớn và chuyển đổi số",
				en: "Software production, R&D centers, AI/data & digital technology incentives",
			},
			headlineBenefit: {
				vi: "Thuế suất TNDN 10% trong 15 năm (miễn 4 năm, giảm 50% trong 9 năm) cho dự án sản xuất phần mềm & trung tâm R&D đạt chuẩn",
				en: "10% CIT for 15 years (4 years exemption + 9 years 50% reduction) for qualifying software production & R&D centers",
			},
			description: {
				vi: "Dự án mới sản xuất sản phẩm phần mềm, an toàn thông tin, nghiên cứu phát triển (R&D) thuộc Danh mục ngành nghề đặc biệt ưu đãi đầu tư (Phụ lục II Nghị định 31/2021/NĐ-CP) không phụ thuộc địa bàn.",
				en: "New software production, cybersecurity, and R&D projects qualify as specially encouraged sectors under Appendix II of Decree 31/2021/ND-CP regardless of province.",
			},
			eligibilityNote: {
				vi: "Doanh nghiệp phải đáp ứng quy trình sản xuất phần mềm theo quy định của Bộ Thông tin & Truyền thông (nay là Bộ KH&CN).",
				en: "Requires documented compliance with official software production process stages.",
			},
			validFrom: "2021-03-26",
			validTo: null,
			reference: REF_DECREE_31,
		},
		{
			id: "inc-retail-supply-chain",
			code: "INC_RETAIL_SUPPLY_CHAIN",
			sector: "retail",
			geoId: null,
			zoneTier: "difficult_area",
			incentiveType: "land_rent_exemption",
			investorType: "foreign_investor",
			displayOrder: 6,
			title: {
				vi: "Chính sách thuế & mặt bằng đối với hệ thống bán lẻ và chuỗi cung ứng nông sản",
				en: "Tax & land-lease policy for retail distribution and cold-chain networks",
			},
			headlineBenefit: {
				vi: "Bán lẻ đô thị áp dụng thuế TNDN chuẩn 20%; ưu đãi 17% (10 năm) nếu đầu tư hạ tầng thương mại/bảo quản nông sản tại địa bàn khó khăn",
				en: "Urban retail applies standard 20% CIT; 17% CIT (10 years) available for cold-chain/commercial infrastructure in difficult areas",
			},
			description: {
				vi: "Hoạt động phân phối, bán lẻ hàng hóa tại các đô thị lớn không thuộc ngành ưu đãi thuế TNDN; tuy nhiên dự án trung tâm bảo quản nông sản, chuỗi lạnh tại địa bàn KT-XH khó khăn được hưởng ưu đãi theo địa bàn.",
				en: "General urban retail distribution is not an encouraged tax sector; however, agricultural cold-chain and commercial infrastructure in designated difficult districts qualify for location-based relief.",
			},
			eligibilityNote: {
				vi: "Kiểm tra danh mục cấp xã/huyện thuộc Phụ lục III Nghị định 31/2021/NĐ-CP trước khi lập hồ sơ dự án.",
				en: "Verify commune/district inclusion in Appendix III of Decree 31/2021/ND-CP prior to project filing.",
			},
			validFrom: "2021-03-26",
			validTo: null,
			reference: REF_DECREE_31,
		},
	];

const EZ_HIGHTECH_CODES = new Set([
	"01", // Hà Nội (Hòa Lạc High-Tech Park)
	"22", // Quảng Ninh (Vân Đồn, Quảng Yên, Móng Cái EZ)
	"31", // Hải Phòng (Đình Vũ – Cát Hải EZ)
	"38", // Thanh Hóa (Nghi Sơn EZ)
	"40", // Nghệ An (Đông Nam EZ)
	"42", // Hà Tĩnh (Vũng Áng EZ)
	"46", // Huế (Chân Mây – Lăng Cô EZ)
	"48", // Đà Nẵng (Da Nang High-Tech Park & Free Trade Zone)
	"51", // Quảng Ngãi (Dung Quất EZ)
	"52", // Gia Lai / Bình Định (Nhơn Hội EZ)
	"56", // Khánh Hòa (Vân Phong EZ)
	"79", // TP. Hồ Chí Minh (SHTP & Cái Mép/Cần Giờ corridor)
	"91", // An Giang / Kiên Giang (Phú Quốc EZ & border EZ)
]);

const SPECIAL_DIFFICULT_CODES = new Set([
	"04", // Cao Bằng
	"08", // Tuyên Quang / Hà Giang
	"11", // Điện Biên
	"12", // Lai Châu
	"14", // Sơn La
	"15", // Lào Cai
	"66", // Đắk Lắk
]);

export function describeProvinceIncentiveZones(province: {
	id: string;
	code: string;
	displayName: string;
}): ProvinceIncentiveZoneProfile {
	const hasEzOrHighTech = EZ_HIGHTECH_CODES.has(province.code);
	const hasSpecialDifficult = SPECIAL_DIFFICULT_CODES.has(province.code);

	const applicableTiers: IncentiveZoneTier[] = [
		"sector_encouraged",
		"industrial_park",
		"standard",
	];
	if (hasEzOrHighTech) applicableTiers.unshift("economic_zone_hightech");
	if (hasSpecialDifficult) {
		applicableTiers.unshift("special_difficult_area", "difficult_area");
	} else {
		applicableTiers.push("difficult_area");
	}

	const primaryZoneTier: IncentiveZoneTier = hasEzOrHighTech
		? "economic_zone_hightech"
		: hasSpecialDifficult
			? "special_difficult_area"
			: "industrial_park";

	const keyZones = hasEzOrHighTech
		? {
				vi: `${province.displayName}: Có Khu kinh tế / Khu công nghệ cao & hệ thống KCN tập trung (hưởng khung ưu đãi cao nhất khi đặt dự án trong ranh giới KKT/KCNC).`,
				en: `${province.displayName}: Hosts an Economic Zone / High-Tech Park & Industrial Parks (eligible for top-tier EZ/HTP incentives inside zone boundaries).`,
			}
		: hasSpecialDifficult
			? {
					vi: `${province.displayName}: Nhiều địa bàn thuộc danh mục điều kiện KT-XH đặc biệt khó khăn / khó khăn (Phụ lục III Nghị định 31/2021/NĐ-CP).`,
					en: `${province.displayName}: Multiple districts designated as specially difficult / difficult socio-economic areas (Appendix III, Decree 31/2021/ND-CP).`,
				}
			: {
					vi: `${province.displayName}: Có hệ thống Khu công nghiệp tập trung & một số địa bàn cấp huyện thuộc diện KT-XH khó khăn.`,
					en: `${province.displayName}: Features approved Industrial Parks and selected districts eligible for difficult-area incentives.`,
				};

	return {
		provinceId: province.id,
		provinceCode: province.code,
		provinceName: province.displayName,
		primaryZoneTier,
		applicableTiers: [...new Set(applicableTiers)],
		keyZones,
		authorityNote: {
			vi: "Mức ưu đãi cụ thể được ghi nhận trên Giấy chứng nhận đăng ký đầu tư (IRC) hoặc xác nhận của cơ quan Thuế/Hải quan theo vị trí lô đất thực tế.",
			en: "Final incentive terms are recorded on the Investment Registration Certificate (IRC) and confirmed by Tax/Customs authorities based on exact plot coordinates.",
		},
	};
}

export function matchIncentivesForSectorAndProvinces(
	allIncentives: readonly InvestmentIncentiveItem[],
	sector: SectorId,
	provinces: ReadonlyArray<{ id: string; code: string; displayName: string }>,
) {
	const provinceProfiles = provinces.map(describeProvinceIncentiveZones);
	const activeTiers = new Set<IncentiveZoneTier>(
		provinceProfiles.length > 0
			? provinceProfiles.flatMap((profile) => profile.applicableTiers)
			: [
					"economic_zone_hightech",
					"industrial_park",
					"sector_encouraged",
					"difficult_area",
					"special_difficult_area",
					"standard",
				],
	);
	const selectedGeoIds = new Set(provinces.map((item) => item.id));

	const matched = allIncentives.filter((item) => {
		const sectorMatches = item.sector === null || item.sector === sector;
		const geoMatches =
			item.geoId === null ||
			selectedGeoIds.size === 0 ||
			selectedGeoIds.has(item.geoId);
		const tierMatches = activeTiers.has(item.zoneTier);
		return sectorMatches && geoMatches && tierMatches;
	});

	return {
		advisoryOnly: true as const,
		entitlementCertified: false as const,
		sector,
		provinceProfiles,
		incentives: matched,
	};
}
