import type { Locale } from "./locale";
import { translate } from "./index";

const indicatorLabelsVi: Record<string, string> = {
	POP_AVG: "Dân số trung bình",
	POP_TOTAL: "Dân số",
	AREA_TOTAL: "Diện tích",
	POP_DENSITY: "Mật độ dân số",
	GRDP_PC: "GRDP bình quân đầu người",
	GRDP_GROWTH: "Tăng trưởng GRDP",
	RETAIL_TOTAL: "Bán lẻ và doanh thu dịch vụ tiêu dùng",
	FDI_LICENSED: "Vốn đăng ký FDI trong năm",
	ENTERPRISES_NEW: "Doanh nghiệp đăng ký mới",
	LABOR_FORCE: "Lực lượng lao động từ 15 tuổi",
	TRAINED_LABOR_RATE: "Tỷ lệ lao động đã qua đào tạo",
};

const unitLabelsVi: Record<string, string> = {
	"%": "%",
	"billion VND": "tỷ đồng",
	enterprises: "doanh nghiệp",
	"million USD": "triệu USD",
	"million VND/person": "triệu đồng/người",
	"thousand people": "nghìn người",
	people: "người",
	"people/km2": "người/km²",
	km2: "km²",
};

const scopeLabelsVi: Record<string, string> = {
	annual_licensed_fdi_registered_capital:
		"vốn FDI đăng ký được cấp phép trong năm",
	current_prices_per_resident: "giá hiện hành trên đầu người",
	goods_and_consumer_services_current_prices:
		"hàng hóa và dịch vụ tiêu dùng, giá hiện hành",
	labour_force_age_15_plus: "lực lượng lao động từ 15 tuổi",
	new_registrations: "đăng ký mới",
	real_grdp_year_over_year: "GRDP thực tế so với năm trước",
	trained_workers_age_15_plus: "lao động đã qua đào tạo từ 15 tuổi",
};

/**
 * Official 6 Centrally-Governed Cities (Thành phố trực thuộc Trung ương) of Vietnam:
 * - 01: Thành phố Hà Nội
 * - 31: Thành phố Hải Phòng
 * - 46: Thành phố Huế
 * - 48: Thành phố Đà Nẵng
 * - 79: Thành phố Hồ Chí Minh
 * - 92: Thành phố Cần Thơ
 */
const CENTRALLY_GOVERNED_CITY_CODES = new Set([
	"01",
	"31",
	"46",
	"48",
	"79",
	"92",
	"DEMO-HN",
	"DEMO-HP",
	"DEMO-HUE",
	"DEMO-DN",
	"DEMO-HCM",
	"DEMO-CT",
]);

const CENTRALLY_GOVERNED_CITY_NAMES = new Set([
	"ha noi",
	"hanoi",
	"thanh pho ha noi",
	"hai phong",
	"haiphong",
	"thanh pho hai phong",
	"hue",
	"thanh pho hue",
	"da nang",
	"danang",
	"thanh pho da nang",
	"ho chi minh",
	"tp. ho chi minh",
	"tp ho chi minh",
	"thanh pho ho chi minh",
	"ho chi minh city",
	"can tho",
	"cantho",
	"thanh pho can tho",
]);

function normalizeAdminText(raw: string): string {
	return raw
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/đ/gi, "d")
		.toLowerCase()
		.trim();
}

export type PlaceIdentityInput = {
	level?: string | null;
	code?: string | null;
	name?: string | null;
	displayName?: string | null;
};

export function isCentrallyGovernedCity(
	place?: PlaceIdentityInput | null,
): boolean {
	if (!place) return false;
	if (place.code && CENTRALLY_GOVERNED_CITY_CODES.has(place.code.trim())) {
		return true;
	}
	for (const candidate of [place.displayName, place.name]) {
		if (!candidate) continue;
		const normalized = normalizeAdminText(candidate);
		if (CENTRALLY_GOVERNED_CITY_NAMES.has(normalized)) {
			return true;
		}
	}
	return false;
}

function stripAdminPrefixOrSuffix(raw: string): string {
	return raw
		.replace(/^(Thành phố|TP\.|TP|Tỉnh)\s+/i, "")
		.replace(/\s+(City|Province)$/i, "")
		.trim();
}

/**
 * Formats a place's display name according to Vietnam's official administrative conventions:
 * - 6 Centrally-governed cities -> "Thành phố Hà Nội", "Thành phố Hải Phòng", "Thành phố Huế", "Thành phố Đà Nẵng", "Thành phố Hồ Chí Minh", "Thành phố Cần Thơ" (or "<Name> City" in English)
 * - 28 Provinces -> "Tỉnh Bắc Ninh", "Tỉnh Đồng Nai", "Tỉnh Quảng Ninh"... (or "<Name> Province" in English)
 * - Communes/Wards -> preserves or prefixes "Phường" / "Xã"
 */
export function formalPlaceName(
	locale: Locale,
	place: {
		level?: string | null;
		code?: string | null;
		name?: string | null;
		displayName: string;
	},
): string {
	const raw = place.displayName.trim();
	if (!raw) return raw;
	const level = place.level ?? "province";

	if (level === "country") {
		return locale === "vi" ? "Việt Nam" : "Vietnam";
	}

	if (level === "province") {
		const coreName = stripAdminPrefixOrSuffix(raw);
		const isCity = isCentrallyGovernedCity(place);
		if (locale === "vi") {
			return isCity ? `Thành phố ${coreName}` : `Tỉnh ${coreName}`;
		}
		return isCity ? `${coreName} City` : `${coreName} Province`;
	}

	return raw;
}

export function indicatorLabel(
	locale: Locale,
	code: string,
	published: string,
): string {
	return locale === "vi" ? (indicatorLabelsVi[code] ?? published) : published;
}

export function unitLabel(locale: Locale, unit: string): string {
	return locale === "vi" ? (unitLabelsVi[unit] ?? unit) : unit;
}

export function scopeLabel(locale: Locale, scope: string): string {
	const readable = scope.replaceAll("_", " ");
	return locale === "vi" ? (scopeLabelsVi[scope] ?? readable) : readable;
}

export function qualityLabel(locale: Locale, quality: string): string {
	if (
		quality === "verified" ||
		quality === "supported" ||
		quality === "unavailable"
	) {
		return translate(locale, `quality.${quality}`);
	}
	return quality;
}

export function levelLabel(
	locale: Locale,
	level: string,
	place?: PlaceIdentityInput | null,
): string {
	if (level === "country") {
		return translate(locale, "level.country");
	}
	if (level === "province") {
		if (!place) {
			return translate(locale, "level.provinceOrCity");
		}
		return isCentrallyGovernedCity(place)
			? translate(locale, "level.municipality")
			: translate(locale, "level.province");
	}
	if (level === "commune") {
		if (!place) {
			return translate(locale, "level.communeOrWard");
		}
		const nameNorm = normalizeAdminText(place.displayName ?? place.name ?? "");
		if (nameNorm.startsWith("phuong ") || nameNorm.startsWith("ben nghe")) {
			return translate(locale, "level.ward");
		}
		if (nameNorm.startsWith("dac khu ")) {
			return translate(locale, "level.specialZone");
		}
		if (nameNorm.startsWith("thi tran ")) {
			return translate(locale, "level.township");
		}
		return translate(locale, "level.commune");
	}
	return level;
}
