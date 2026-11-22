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

export function levelLabel(locale: Locale, level: string): string {
	if (level === "country" || level === "province" || level === "commune") {
		return translate(locale, `level.${level}`);
	}
	return level;
}
