import { en, type MessageKey } from "./en";
import { vi } from "./vi";
import { intlLocale, type Locale } from "./locale";

export type { MessageKey };
export { en, vi };

export const messages: Record<Locale, Record<MessageKey, string>> = { en, vi };

export type MessageParams = Record<string, string | number>;

export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const template = messages[locale][key] ?? messages.en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : match);
}

export function hasMessage(locale: Locale, key: string): key is MessageKey {
  return Object.hasOwn(messages[locale], key);
}

export function translateCode(locale: Locale, code: string | null | undefined, fallback: string | null | undefined): string | null {
  if (code && hasMessage(locale, code)) return translate(locale, code);
  return fallback ?? null;
}

export type Translator = (key: MessageKey, params?: MessageParams) => string;

export function createTranslator(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params);
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2, ...options }).format(value);
}

export function formatPercent(locale: Locale, fraction: number): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 1 }).format(fraction);
}

export function formatDate(
  locale: Locale,
  value: string | number | Date,
  options: { timeZone?: string; includeTime?: boolean } = {},
): string {
  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    ...(options.includeTime && { timeStyle: "short" }),
    ...(options.timeZone && { timeZone: options.timeZone }),
  };
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), formatOptions).format(new Date(value));
  } catch (cause) {
    if (!(cause instanceof RangeError)) throw cause;
    return new Intl.DateTimeFormat(intlLocale(locale), { ...formatOptions, timeZone: "UTC" }).format(new Date(value));
  }
}
