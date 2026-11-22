export const LOCALES = ["vi", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_PUBLIC_LOCALE: Locale = "en";
export const DEFAULT_INTERNAL_LOCALE: Locale = "vi";
export const DEFAULT_LOCALE: Locale = DEFAULT_PUBLIC_LOCALE;

export const LOCALE_COOKIE = "ecom_locale";
export const LOCALE_HEADER = "x-ecom-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function defaultLocaleForPath(pathname: string): Locale {
  return pathname === "/internal" || pathname.startsWith("/internal/")
    ? DEFAULT_INTERNAL_LOCALE
    : DEFAULT_PUBLIC_LOCALE;
}

export function parseLocale(value: string | null | undefined, fallback: Locale = DEFAULT_LOCALE): Locale {
  return isLocale(value) ? value : fallback;
}

export function intlLocale(locale: Locale): string {
  return locale === "vi" ? "vi-VN" : "en-US";
}
