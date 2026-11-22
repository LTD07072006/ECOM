import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, LOCALE_HEADER, defaultLocaleForPath, isLocale } from "./lib/i18n/locale";

export function middleware(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("lang");
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(requested)
    ? requested
    : isLocale(cookie)
      ? cookie
      : defaultLocaleForPath(request.nextUrl.pathname);

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  const response = NextResponse.next({ request: { headers } });

  if (isLocale(requested) && requested !== cookie) {
    response.cookies.set(LOCALE_COOKIE, requested, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
