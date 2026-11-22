"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { formatDate, formatNumber, formatPercent, translate, translateCode, type MessageKey, type MessageParams } from "./index";
import { DEFAULT_LOCALE, type Locale } from "./locale";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useI18n() {
  const locale = useLocale();
  const t = useCallback((key: MessageKey, params?: MessageParams) => translate(locale, key, params), [locale]);
  return {
    locale,
    t,
    tc: (code: string | null | undefined, fallback: string | null | undefined) => translateCode(locale, code, fallback),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(locale, value, options),
    formatPercent: (value: number) => formatPercent(locale, value),
    formatDate: (value: string | number | Date, options?: { timeZone?: string; includeTime?: boolean }) =>
      formatDate(locale, value, options),
  };
}
