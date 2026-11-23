import { haversineKm, type InfrastructureKind } from "./layers";

export type ReferenceInfrastructurePoi = {
	code: string;
	name: string;
	kind: InfrastructureKind;
	provinceCode: string;
	provinceName: string;
	latitude: number;
	longitude: number;
	referenceUrl: string;
};

export type ProvinceProximityMatch = {
	geoId: string;
	code: string;
	name: string;
	nearestPoiCode: string;
	nearestPoiName: string;
	nearestPoiKind: InfrastructureKind;
	distanceKm: number;
	withinRadius: boolean;
};

export type ProximitySearchResult = {
	mode: "database" | "unavailable";
	kind: InfrastructureKind;
	maxKm: number;
	totalProvinces: number;
	matchedCount: number;
	matchedProvinceIds: string[];
	provinces: ProvinceProximityMatch[];
	pois: ReferenceInfrastructurePoi[];
};

export const canonicalInfrastructurePois: readonly ReferenceInfrastructurePoi[] =
	[
		// Major international & regional airports
		{
			code: "HAN",
			name: "Cảng hàng không quốc tế Nội Bài",
			kind: "airport",
			provinceCode: "01",
			provinceName: "Hà Nội",
			latitude: 21.2212,
			longitude: 105.8072,
			referenceUrl: "https://vietnamairport.vn/noibaiairport/",
		},
		{
			code: "HPH",
			name: "Cảng hàng không quốc tế Cát Bi",
			kind: "airport",
			provinceCode: "31",
			provinceName: "Hải Phòng",
			latitude: 20.8194,
			longitude: 106.725,
			referenceUrl: "https://vietnamairport.vn/catbiairport/",
		},
		{
			code: "DAD",
			name: "Cảng hàng không quốc tế Đà Nẵng",
			kind: "airport",
			provinceCode: "48",
			provinceName: "Đà Nẵng",
			latitude: 16.0439,
			longitude: 108.1994,
			referenceUrl: "https://vietnamairport.vn/danangairport/",
		},
		{
			code: "CXR",
			name: "Cảng hàng không quốc tế Cam Ranh",
			kind: "airport",
			provinceCode: "56",
			provinceName: "Khánh Hòa",
			latitude: 11.9982,
			longitude: 109.2194,
			referenceUrl: "https://vietnamairport.vn/camranhairport/",
		},
		{
			code: "SGN",
			name: "Cảng hàng không quốc tế Tân Sơn Nhất",
			kind: "airport",
			provinceCode: "79",
			provinceName: "TP. Hồ Chí Minh",
			latitude: 10.8188,
			longitude: 106.6519,
			referenceUrl: "https://vietnamairport.vn/tansonnhat/",
		},
		{
			code: "VCA",
			name: "Cảng hàng không quốc tế Cần Thơ",
			kind: "airport",
			provinceCode: "92",
			provinceName: "Cần Thơ",
			latitude: 10.0851,
			longitude: 105.7119,
			referenceUrl: "https://vietnamairport.vn/canthoairport/",
		},

		// Major deep-water & container seaports
		{
			code: "VNHPH-LH",
			name: "Cảng nước sâu Lạch Huyện – Hải Phòng",
			kind: "seaport",
			provinceCode: "31",
			provinceName: "Hải Phòng",
			latitude: 20.8086,
			longitude: 106.8897,
			referenceUrl: "https://vinamarine.gov.vn/",
		},
		{
			code: "VNQNH-CL",
			name: "Cảng nước sâu Cái Lân – Quảng Ninh",
			kind: "seaport",
			provinceCode: "22",
			provinceName: "Quảng Ninh",
			latitude: 20.9764,
			longitude: 107.0431,
			referenceUrl: "https://vinamarine.gov.vn/",
		},
		{
			code: "VNTHA-NS",
			name: "Cảng nước sâu Nghi Sơn – Thanh Hóa",
			kind: "seaport",
			provinceCode: "38",
			provinceName: "Thanh Hóa",
			latitude: 19.3272,
			longitude: 105.8058,
			referenceUrl: "https://vinamarine.gov.vn/",
		},
		{
			code: "VNHTI-VA",
			name: "Cảng nước sâu Vũng Áng – Sơn Dương",
			kind: "seaport",
			provinceCode: "42",
			provinceName: "Hà Tĩnh",
			latitude: 18.0975,
			longitude: 106.4122,
			referenceUrl: "https://vinamarine.gov.vn/",
		},
		{
			code: "VNDAD-TS",
			name: "Cảng Tiên Sa – Liên Chiểu Đà Nẵng",
			kind: "seaport",
			provinceCode: "48",
			provinceName: "Đà Nẵng",
			latitude: 16.1211,
			longitude: 108.2156,
			referenceUrl: "https://vinamarine.gov.vn/",
		},
		{
			code: "VNQNG-DQ",
			name: "Cảng nước sâu Dung Quất",
			kind: "seaport",
			provinceCode: "51",
			provinceName: "Quảng Ngãi",
			latitude: 15.4086,
			longitude: 108.7864,
			referenceUrl: "https://vinamarine.gov.vn/",
		},
		{
			code: "VNSGN-CM",
			name: "Cụm cảng nước sâu Cái Mép – Thị Vải & Cát Lái",
			kind: "seaport",
			provinceCode: "79",
			provinceName: "TP. Hồ Chí Minh",
			latitude: 10.5256,
			longitude: 107.0189,
			referenceUrl: "https://vinamarine.gov.vn/",
		},
		{
			code: "VNVCA-CP",
			name: "Cụm cảng Cái Cui – Cần Thơ",
			kind: "seaport",
			provinceCode: "92",
			provinceName: "Cần Thơ",
			latitude: 9.9922,
			longitude: 105.8186,
			referenceUrl: "https://vinamarine.gov.vn/",
		},

		// Key verified industrial parks & economic zones
		{
			code: "IP-DEEPC",
			name: "Tổ hợp KCN DEEP C Hải Phòng (KKT Đình Vũ – Cát Hải)",
			kind: "industrial_park",
			provinceCode: "31",
			provinceName: "Hải Phòng",
			latitude: 20.8315,
			longitude: 106.7745,
			referenceUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
		{
			code: "IP-YP-BN",
			name: "KCN Yên Phong & VSIP Bắc Ninh",
			kind: "industrial_park",
			provinceCode: "24",
			provinceName: "Bắc Ninh",
			latitude: 21.1981,
			longitude: 105.9639,
			referenceUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
		{
			code: "IP-HL-HN",
			name: "Khu Công nghệ cao Hòa Lạc – Hà Nội",
			kind: "industrial_park",
			provinceCode: "01",
			provinceName: "Hà Nội",
			latitude: 21.0039,
			longitude: 105.5333,
			referenceUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
		{
			code: "IP-DHTP",
			name: "Khu Công nghệ cao Đà Nẵng & KCN Hòa Khánh",
			kind: "industrial_park",
			provinceCode: "48",
			provinceName: "Đà Nẵng",
			latitude: 16.0914,
			longitude: 108.0889,
			referenceUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
		{
			code: "IP-AMATA-DN",
			name: "KCN Amata & Long Thành – Đồng Nai",
			kind: "industrial_park",
			provinceCode: "75",
			provinceName: "Đồng Nai",
			latitude: 10.9411,
			longitude: 106.8839,
			referenceUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},
		{
			code: "IP-SHTP-VSIP",
			name: "Khu Công nghệ cao TP.HCM & Tổ hợp KCN VSIP",
			kind: "industrial_park",
			provinceCode: "79",
			provinceName: "TP. Hồ Chí Minh",
			latitude: 10.855,
			longitude: 106.785,
			referenceUrl: "https://investvietnam.gov.vn/en/industrial-zones.pl.html",
		},

		// Inland Container Depots (ICDs)
		{
			code: "ICD-MYDINH",
			name: "Cảng cạn ICD Mỹ Đình / Cổ Bi – Hà Nội",
			kind: "icd",
			provinceCode: "01",
			provinceName: "Hà Nội",
			latitude: 21.0285,
			longitude: 105.778,
			referenceUrl: "https://vinamarine.gov.vn/",
		},
		{
			code: "ICD-TIENSON",
			name: "Cảng cạn ICD Tiên Sơn – Bắc Ninh",
			kind: "icd",
			provinceCode: "24",
			provinceName: "Bắc Ninh",
			latitude: 21.1167,
			longitude: 105.9833,
			referenceUrl: "https://vinamarine.gov.vn/",
		},
		{
			code: "ICD-PHUOCLONG",
			name: "Cụm cảng cạn ICD Phước Long & Sóng Thần",
			kind: "icd",
			provinceCode: "79",
			provinceName: "TP. Hồ Chí Minh",
			latitude: 10.8325,
			longitude: 106.7625,
			referenceUrl: "https://vinamarine.gov.vn/",
		},

		// Major National Expressway Nodes
		{
			code: "EXP-CT04-HP",
			name: "Nút giao Cao tốc Hà Nội – Hải Phòng – Quảng Ninh (CT.04)",
			kind: "expressway_node",
			provinceCode: "31",
			provinceName: "Hải Phòng",
			latitude: 20.825,
			longitude: 106.665,
			referenceUrl: "https://mt.gov.vn/",
		},
		{
			code: "EXP-CT01-DN",
			name: "Nút giao Cao tốc Bắc – Nam đoạn Đà Nẵng – Quảng Ngãi (CT.01)",
			kind: "expressway_node",
			provinceCode: "48",
			provinceName: "Đà Nẵng",
			latitude: 16.002,
			longitude: 108.165,
			referenceUrl: "https://mt.gov.vn/",
		},
		{
			code: "EXP-CT29-LT",
			name: "Nút giao Cao tốc TP.HCM – Long Thành – Dầu Giây (CT.29)",
			kind: "expressway_node",
			provinceCode: "75",
			provinceName: "Đồng Nai",
			latitude: 10.793,
			longitude: 106.952,
			referenceUrl: "https://mt.gov.vn/",
		},
	];

export function computeProximityForProvinces(
	provinces: ReadonlyArray<{
		id: string;
		code: string;
		displayName: string;
		latitude: number | null;
		longitude: number | null;
	}>,
	pois: readonly ReferenceInfrastructurePoi[],
	kind: InfrastructureKind,
	maxKm: number,
): ProximitySearchResult {
	const candidatePois = pois.filter((poi) => poi.kind === kind);
	const evaluated: ProvinceProximityMatch[] = [];

	for (const province of provinces) {
		if (
			province.latitude === null ||
			province.longitude === null ||
			candidatePois.length === 0
		) {
			continue;
		}
		let nearest = candidatePois[0];
		let minDistance = Number.POSITIVE_INFINITY;
		for (const poi of candidatePois) {
			const dist = haversineKm(
				province.latitude,
				province.longitude,
				poi.latitude,
				poi.longitude,
			);
			if (dist < minDistance) {
				minDistance = dist;
				nearest = poi;
			}
		}
		const roundedKm = Math.round(minDistance * 10) / 10;
		evaluated.push({
			geoId: province.id,
			code: province.code,
			name: province.displayName,
			nearestPoiCode: nearest.code,
			nearestPoiName: nearest.name,
			nearestPoiKind: kind,
			distanceKm: roundedKm,
			withinRadius: roundedKm <= maxKm,
		});
	}

	evaluated.sort(
		(left, right) =>
			left.distanceKm - right.distanceKm || left.name.localeCompare(right.name),
	);
	const matchedProvinceIds = evaluated
		.filter((item) => item.withinRadius)
		.map((item) => item.geoId);

	return {
		mode: "database",
		kind,
		maxKm,
		totalProvinces: evaluated.length,
		matchedCount: matchedProvinceIds.length,
		matchedProvinceIds,
		provinces: evaluated,
		pois: [...candidatePois],
	};
}
