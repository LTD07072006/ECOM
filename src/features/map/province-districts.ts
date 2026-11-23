import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

type Text = { vi: string; en: string };
export type DistrictSector =
	| "retail"
	| "manufacturing"
	| "logistics"
	| "enterprise";
type UnitType =
	| "urban_district"
	| "municipal_city"
	| "town"
	| "rural_district"
	| "ward_cluster";
export type DistrictBoundary = Polygon | MultiPolygon;
export type ProvinceDistrictProfile = {
	id: string;
	code: string;
	provinceCode: string;
	provinceName: string;
	unitType: UnitType;
	scope: "current" | "advisory";
	name: Text;
	latitude: number | null;
	longitude: number | null;
	economicRole: Text | null;
	demographics: {
		population: number | null;
		density: number | null;
		purchasingPower: Text | null;
		urbanization: number | null;
		dataQuality: "verified" | "supported" | "advisory";
		sourceNote: Text;
	};
	realEstateAndUtilities: { rent: Text | null; connections: Text | null };
	recommendedSectors: { sector: DistrictSector; reason: Text }[];
	linkedMicroLocationIds: string[];
};

type Seed = [
	string,
	UnitType,
	string,
	string,
	number,
	number,
	DistrictSector,
	string,
	string,
	string,
	string,
	...string[],
];
const additionalSeeds: Record<string, Seed[]> = {
	"01": [
		[
			"starlake",
			"ward_cluster",
			"Tây Hồ – Starlake",
			"Tây Hồ – Starlake",
			21.058,
			105.806,
			"retail",
			"Cụm đô thị và dịch vụ dành cho chuyên gia",
			"Residential and services cluster for professionals",
			"Trục Võ Chí Công, cầu Nhật Tân",
			"Vo Chi Cong corridor and Nhat Tan Bridge",
			"HN-RZ-TAYHOTAY",
		],
		[
			"my-dinh",
			"ward_cluster",
			"Nam Từ Liêm – Mỹ Đình",
			"Nam Từ Liêm – Mỹ Đình",
			21.016,
			105.771,
			"retail",
			"Đô thị phía tây và dịch vụ giao hàng",
			"Western residential and delivery market",
			"Đại lộ Thăng Long, Vành đai 3",
			"Thang Long Boulevard and Ring Road 3",
			"HN-RZ-SMARTCITY",
		],
		[
			"gia-lam",
			"ward_cluster",
			"Gia Lâm – Long Biên",
			"Gia Lâm – Long Biên",
			21.001,
			105.936,
			"retail",
			"Cụm đô thị phía đông",
			"Eastern residential growth area",
			"Quốc lộ 5, cao tốc Hà Nội – Hải Phòng",
			"National Route 5 and Hanoi–Hai Phong Expressway",
			"HN-RZ-OCEANPARK",
		],
		[
			"hoa-lac",
			"ward_cluster",
			"Thạch Thất – Hòa Lạc",
			"Thạch Thất – Hòa Lạc",
			21.004,
			105.529,
			"manufacturing",
			"Khu công nghệ cao và nghiên cứu ứng dụng",
			"High-tech and applied research cluster",
			"Đại lộ Thăng Long, Quốc lộ 21",
			"Thang Long Boulevard and National Route 21",
			"HN-IZ-HOALAC",
		],
	],
	"79": [
		[
			"cbd",
			"urban_district",
			"Quận 1 – Trung tâm CBD",
			"District 1 – Central business district",
			10.775,
			106.7,
			"enterprise",
			"Lõi tài chính, khách sạn và bán lẻ cao cấp",
			"Finance, hospitality and premium retail core",
			"Metro số 1, ga Bến Thành",
			"Metro Line 1 and Ben Thanh Station",
		],
		[
			"hiep-phuoc",
			"ward_cluster",
			"Nhà Bè – Hiệp Phước",
			"Nhà Bè – Hiệp Phước",
			10.638,
			106.75,
			"logistics",
			"Cụm cảng, kho vận và chuỗi lạnh",
			"Port, warehousing and cold-chain cluster",
			"Trục Nguyễn Hữu Thọ và cảng Hiệp Phước",
			"Nguyen Huu Tho corridor and Hiep Phuoc Port",
			"HCM-IZ-HIEPPHUOC",
		],
	],
	"31": [
		[
			"thuy-nguyen",
			"ward_cluster",
			"Thủy Nguyên",
			"Thủy Nguyên",
			20.928,
			106.727,
			"manufacturing",
			"Cụm sản xuất và đô thị Bắc Sông Cấm",
			"Manufacturing and North Cam River urban cluster",
			"Cầu Hoàng Văn Thụ và trục Bắc Sông Cấm",
			"Hoang Van Thu Bridge and North Cam River corridor",
			"HP-IZ-VSIP",
			"HP-RZ-BACSONGCAM",
		],
		[
			"an-duong",
			"ward_cluster",
			"An Dương",
			"An Dương",
			20.899,
			106.601,
			"manufacturing",
			"Chuỗi cung ứng điện tử quanh Tràng Duệ",
			"Electronics supply chain around Trang Due",
			"Quốc lộ 10 và Quốc lộ 5",
			"National Routes 10 and 5",
			"HP-IZ-TRANGDUE",
		],
		[
			"hong-bang",
			"ward_cluster",
			"Hồng Bàng – Lê Chân",
			"Hồng Bàng – Lê Chân",
			20.858,
			106.681,
			"retail",
			"Lõi thương mại và dịch vụ Hải Phòng",
			"Hai Phong retail and services core",
			"Trục Tô Hiệu và ga Hải Phòng",
			"To Hieu corridor and Hai Phong railway station",
			"HP-RZ-HONGBANG",
		],
	],
	"48": [
		[
			"lien-chieu",
			"ward_cluster",
			"Liên Chiểu",
			"Liên Chiểu",
			16.083,
			108.146,
			"logistics",
			"Cụm công nghiệp và hành lang cảng",
			"Industrial and port corridor",
			"Quốc lộ 1, khu vực dự án cảng Liên Chiểu",
			"National Route 1 and the Lien Chieu port project area",
			"DN-IZ-HOAKHANH",
		],
		[
			"hoa-vang",
			"ward_cluster",
			"Hòa Vang",
			"Hòa Vang",
			16.111,
			108.003,
			"manufacturing",
			"Cụm sản xuất công nghệ cao",
			"High-tech manufacturing cluster",
			"Tuyến đường kết nối Khu Công nghệ cao",
			"High-Tech Park access corridor",
			"DN-IZ-DHTP",
		],
		[
			"hoa-xuan",
			"ward_cluster",
			"Cẩm Lệ – Ngũ Hành Sơn",
			"Cẩm Lệ – Ngũ Hành Sơn",
			15.989,
			108.222,
			"retail",
			"Đô thị phía nam và dịch vụ công nghệ",
			"Southern residential and technology services area",
			"Cầu Hòa Xuân và trục Võ Chí Công",
			"Hoa Xuan Bridge and Vo Chi Cong corridor",
			"DN-RZ-HOAXUAN",
		],
	],
	"46": [
		[
			"chan-may",
			"ward_cluster",
			"Phú Lộc – Chân Mây",
			"Phú Lộc – Chân Mây",
			16.307,
			108.015,
			"logistics",
			"Khu kinh tế ven biển và cụm cảng",
			"Coastal economic zone and port cluster",
			"Cảng Chân Mây và Quốc lộ 1",
			"Chan May Port and National Route 1",
			"HUE-IZ-CHANMAY",
		],
	],
	"92": [
		[
			"can-tho-west",
			"ward_cluster",
			"Vĩnh Thạnh – Bình Thủy",
			"Vĩnh Thạnh – Bình Thủy",
			10.162,
			105.422,
			"manufacturing",
			"Cụm sản xuất và cửa ngõ hàng không miền Tây",
			"Western manufacturing and aviation gateway",
			"Quốc lộ 80; sân bay Cần Thơ tại Bình Thủy",
			"National Route 80 and Can Tho Airport in Binh Thuy",
			"CT-IZ-VSIP",
		],
	],
	"24": [
		[
			"tu-son",
			"ward_cluster",
			"Từ Sơn",
			"Từ Sơn",
			21.108,
			105.958,
			"manufacturing",
			"Sản xuất phụ trợ trên hành lang Hà Nội – Bắc Ninh",
			"Supporting industry on the Hanoi–Bac Ninh corridor",
			"Quốc lộ 1 và hành lang Quốc lộ 18",
			"National Route 1 and the Route 18 corridor",
			"BN-IZ-VSIP",
		],
	],
	"75": [
		[
			"bien-hoa",
			"ward_cluster",
			"Biên Hòa",
			"Biên Hòa",
			10.946,
			106.824,
			"retail",
			"Đô thị công nghiệp và thị trường bán lẻ",
			"Industrial city and retail market",
			"Quốc lộ 1, ga Biên Hòa",
			"National Route 1 and Bien Hoa railway station",
			"DNA-RZ-BIENHOA",
		],
		[
			"nhon-trach",
			"ward_cluster",
			"Nhơn Trạch",
			"Nhơn Trạch",
			10.721,
			106.895,
			"manufacturing",
			"Cụm nhà máy và hậu cần công nghiệp",
			"Industrial production and logistics cluster",
			"Đường 25B và 25C",
			"Routes 25B and 25C",
			"DNA-IZ-NHONTRACH",
		],
	],
};

const sectorContext: Record<
	DistrictSector,
	{ purchasing: Text; secondary: DistrictSector; reason: Text }
> = {
	retail: {
		purchasing: {
			vi: "Sàng lọc nhu cầu mua sắm thường nhật và dịch vụ của cư dân; cần khảo sát thu nhập và lưu lượng tại điểm bán.",
			en: "Screen household demand for daily shopping and services; validate incomes and footfall at the site.",
		},
		secondary: "logistics",
		reason: {
			vi: "Xem xét giao hàng chặng cuối phục vụ khu dân cư.",
			en: "Consider last-mile delivery serving nearby households.",
		},
	},
	manufacturing: {
		purchasing: {
			vi: "Khảo sát nhu cầu hàng thiết yếu của lao động theo ca; chưa có phân bổ thu nhập.",
			en: "Survey shift workers’ demand for essentials; income distribution is unavailable.",
		},
		secondary: "logistics",
		reason: {
			vi: "Kiểm tra nhu cầu gom hàng và kho phục vụ nhà máy.",
			en: "Check consolidation and warehousing demand from factories.",
		},
	},
	logistics: {
		purchasing: {
			vi: "Ưu tiên khảo sát chi tiêu dịch vụ của đội vận tải; không suy rộng sang hộ gia đình.",
			en: "Screen transport operators’ service spending; do not extrapolate to households.",
		},
		secondary: "manufacturing",
		reason: {
			vi: "Đánh giá lắp ráp nhẹ cần vận chuyển đầu vào và đầu ra.",
			en: "Screen light assembly requiring inbound and outbound freight.",
		},
	},
	enterprise: {
		purchasing: {
			vi: "Khảo sát phân khúc nhân viên văn phòng và chuyên gia; chưa xác nhận thu nhập hay sức mua thực tế.",
			en: "Screen office workers and professionals; incomes and actual purchasing power are unconfirmed.",
		},
		secondary: "retail",
		reason: {
			vi: "Thử nghiệm dịch vụ ăn uống và tiện ích phục vụ khách văn phòng.",
			en: "Test food service and convenience demand from office workers.",
		},
	},
};

const seeds: Record<string, Seed[]> = {
	"01": [
		[
			"cau-giay",
			"urban_district",
			"Quận Cầu Giấy",
			"Cầu Giấy District",
			21.031,
			105.795,
			"enterprise",
			"Cụm văn phòng và dịch vụ công nghệ",
			"Office and technology services cluster",
			"Vành đai 3, tuyến metro Nhổn – ga Hà Nội",
			"Ring Road 3 and the Nhon–Hanoi Station metro line",
		],
		[
			"dong-anh",
			"rural_district",
			"Huyện Đông Anh",
			"Đông Anh District",
			21.124,
			105.777,
			"manufacturing",
			"Cụm sản xuất phía bắc Hà Nội",
			"Northern Hanoi manufacturing cluster",
			"Đường Võ Nguyên Giáp, cửa ngõ Nội Bài",
			"Vo Nguyen Giap corridor toward Noi Bai",
			"HN-IZ-TLIP",
		],
	],
	"79": [
		[
			"thu-duc",
			"municipal_city",
			"TP. Thủ Đức",
			"Thủ Đức City",
			10.853,
			106.787,
			"enterprise",
			"Cụm công nghệ cao và dịch vụ phía đông",
			"Eastern technology and services cluster",
			"Metro số 1, Xa lộ Hà Nội",
			"Metro Line 1 and Hanoi Highway",
			"HCM-IZ-SHTP",
			"HCM-RZ-THUTHIEM",
			"HCM-RZ-GRANDPARK",
		],
		[
			"quan-7",
			"urban_district",
			"Quận 7",
			"District 7",
			10.733,
			106.713,
			"retail",
			"Cụm bán lẻ và đô thị phía nam",
			"Southern retail and residential cluster",
			"Đại lộ Nguyễn Văn Linh",
			"Nguyen Van Linh Boulevard",
			"HCM-RZ-PHUMYHUNG",
		],
	],
	"31": [
		[
			"hai-an",
			"urban_district",
			"Hải An – Đình Vũ",
			"Hải An – Đình Vũ corridor",
			20.838,
			106.752,
			"logistics",
			"Cửa ngõ cảng và hàng không",
			"Port and aviation gateway",
			"Đình Vũ, sân bay Cát Bi",
			"Dinh Vu and Cat Bi Airport",
			"HP-IZ-DEEPC",
		],
	],
	"48": [
		[
			"hai-chau",
			"urban_district",
			"Quận Hải Châu",
			"Hải Châu District",
			16.052,
			108.219,
			"retail",
			"Lõi thương mại ven sông Hàn",
			"Han River commercial core",
			"Trục Bạch Đằng, cầu Rồng",
			"Bach Dang corridor and Dragon Bridge",
			"DN-RZ-HAICHAU",
		],
	],
	"46": [
		[
			"an-van-duong",
			"ward_cluster",
			"Thuận Hóa – An Vân Dương",
			"Thuận Hóa – An Vân Dương area",
			16.458,
			107.62,
			"retail",
			"Khu mở rộng đô thị phía đông Huế",
			"Eastern Hue urban expansion area",
			"Trục Tố Hữu",
			"To Huu corridor",
			"HUE-RZ-ANVANDUONG",
		],
	],
	"92": [
		[
			"ninh-kieu",
			"urban_district",
			"Ninh Kiều – Cái Răng",
			"Ninh Kiều – Cái Răng corridor",
			10.037,
			105.777,
			"retail",
			"Lõi dịch vụ và thương mại Cần Thơ",
			"Can Tho services and retail core",
			"Đại lộ Hòa Bình, bến Ninh Kiều",
			"Hoa Binh Boulevard and Ninh Kieu Wharf",
			"CT-RZ-NINHKIEU",
		],
	],
	"24": [
		[
			"yen-phong",
			"rural_district",
			"Huyện Yên Phong",
			"Yên Phong District",
			21.202,
			105.94,
			"manufacturing",
			"Cụm sản xuất điện tử",
			"Electronics manufacturing cluster",
			"Quốc lộ 18",
			"National Route 18",
			"BN-IZ-YENPHONG",
		],
	],
	"75": [
		[
			"long-thanh",
			"rural_district",
			"Huyện Long Thành",
			"Long Thành District",
			10.787,
			106.963,
			"logistics",
			"Hành lang công nghiệp và logistics",
			"Industrial and logistics corridor",
			"Cao tốc TP.HCM – Long Thành – Dầu Giây; dự án sân bay Long Thành",
			"HCMC–Long Thanh–Dau Giay Expressway and Long Thanh airport project",
			"DNA-IZ-LONGTHANH",
		],
	],
	"22": [
		[
			"cai-lan",
			"ward_cluster",
			"Hạ Long – Cái Lân",
			"Hạ Long – Cái Lân gateway",
			20.971,
			107.047,
			"logistics",
			"Cửa ngõ hàng hóa Hạ Long",
			"Ha Long freight gateway",
			"Cảng Cái Lân",
			"Cai Lan Port",
		],
	],
	"56": [
		[
			"cam-ranh",
			"municipal_city",
			"Cam Ranh – Nha Trang",
			"Cam Ranh – Nha Trang corridor",
			11.908,
			109.142,
			"logistics",
			"Hành lang kết nối sân bay và ven biển",
			"Airport and coastal corridor",
			"Quốc lộ 1, sân bay Cam Ranh",
			"National Route 1 and Cam Ranh Airport",
		],
	],
	"40": [
		[
			"vinh",
			"municipal_city",
			"TP. Vinh",
			"Vinh City",
			18.678,
			105.681,
			"enterprise",
			"Trung tâm dịch vụ Bắc Trung Bộ",
			"North Central Coast services centre",
			"Quốc lộ 1, sân bay Vinh",
			"National Route 1 and Vinh Airport",
		],
	],
};

type Commune = {
	id: string;
	code: string;
	parentId: string | null;
	name: string;
	displayName: string;
	latitude: number | null;
	longitude: number | null;
};

export function classifyDistrict(
	scope: ProvinceDistrictProfile["scope"],
	sector?: DistrictSector,
) {
	return scope === "current"
		? "ward_cluster"
		: sector === "manufacturing"
			? "industrial"
			: sector === "logistics"
				? "gateway"
				: "urban";
}

export function getProvinceDistricts(
	province: { id: string; code: string; name: string },
	communes: Commune[],
): ProvinceDistrictProfile[] {
	const base = {
		provinceCode: province.code,
		provinceName: province.name,
		demographics: {
			population: null,
			density: null,
			purchasingPower: null,
			urbanization: null,
			dataQuality: "advisory" as const,
			sourceNote: {
				vi: "Chưa có số liệu công bố cho phạm vi này.",
				en: "No published statistics are available for this scope.",
			},
		},
	};
	return [
		...[
			...(seeds[province.code] ?? []),
			...(additionalSeeds[province.code] ?? []),
		].map(
			([
				code,
				unitType,
				vi,
				en,
				latitude,
				longitude,
				sector,
				roleVi,
				roleEn,
				connectionVi,
				connectionEn,
				...linkedMicroLocationIds
			]): ProvinceDistrictProfile => ({
				...base,
				id: `${province.code}-${code}`,
				code,
				unitType,
				scope: "advisory",
				name: { vi, en },
				latitude,
				longitude,
				economicRole: { vi: roleVi, en: roleEn },
				demographics: {
					...base.demographics,
					purchasingPower: sectorContext[sector].purchasing,
				},
				realEstateAndUtilities: {
					rent: null,
					connections: { vi: connectionVi, en: connectionEn },
				},
				recommendedSectors: [
					{ sector, reason: { vi: roleVi, en: roleEn } },
					{
						sector: sectorContext[sector].secondary,
						reason: sectorContext[sector].reason,
					},
				],
				linkedMicroLocationIds,
			}),
		),
		...communes
			.filter((unit) => unit.parentId === province.id)
			.map(
				(unit): ProvinceDistrictProfile => ({
					...base,
					id: unit.id,
					code: unit.code,
					unitType: "ward_cluster",
					scope: "current",
					name: { vi: unit.displayName, en: unit.displayName },
					latitude: unit.latitude,
					longitude: unit.longitude,
					economicRole: null,
					realEstateAndUtilities: { rent: null, connections: null },
					recommendedSectors: [],
					linkedMicroLocationIds: [],
				}),
			),
	];
}

export function toDistrictBoundaryGeoJson(
	profile?: ProvinceDistrictProfile | null,
	geometry?: DistrictBoundary | null,
): FeatureCollection<DistrictBoundary> {
	return {
		type: "FeatureCollection",
		features:
			profile?.scope === "current" && geometry
				? [
						{
							type: "Feature",
							id: profile.id,
							geometry,
							properties: { id: profile.id },
						},
					]
				: [],
	};
}
