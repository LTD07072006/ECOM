import { headers } from "next/headers";
import { createTranslator, formatDate, formatNumber, formatPercent } from "./index";
import { LOCALE_HEADER, parseLocale, type Locale } from "./locale";

export async function getLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  return parseLocale(requestHeaders.get(LOCALE_HEADER));
}

export async function getI18n() {
  const locale = await getLocale();
  return {
    locale,
    t: createTranslator(locale),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(locale, value, options),
    formatDate: (value: string | number | Date, options?: { timeZone?: string; includeTime?: boolean }) =>
      formatDate(locale, value, options),
    formatPercent: (value: number) => formatPercent(locale, value),
  };
}
