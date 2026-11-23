import { type NextRequest, NextResponse } from "next/server";
import {
	defaultLocaleForPath,
	isLocale,
	LOCALE_COOKIE,
	LOCALE_HEADER,
} from "./lib/i18n/locale";

function buildContentSecurityPolicy(nonce: string) {
	const scriptSources = [
		"'self'",
		`'nonce-${nonce}'`,
		"'strict-dynamic'",
		...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
	].join(" ");
	return [
		"default-src 'self'",
		`script-src ${scriptSources}`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob:",
		"font-src 'self' data:",
		"connect-src 'self'",
		"worker-src 'self' blob:",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	].join("; ");
}

export function middleware(request: NextRequest) {
	const requested = request.nextUrl.searchParams.get("lang");
	const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
	const locale = isLocale(requested)
		? requested
		: isLocale(cookie)
			? cookie
			: defaultLocaleForPath(request.nextUrl.pathname);

	const nonce = btoa(crypto.randomUUID());
	const csp = buildContentSecurityPolicy(nonce);

	const headers = new Headers(request.headers);
	headers.set(LOCALE_HEADER, locale);
	headers.set("x-nonce", nonce);
	headers.set("Content-Security-Policy", csp);
	const response = NextResponse.next({ request: { headers } });
	response.headers.set("Content-Security-Policy", csp);

	if (isLocale(requested) && requested !== cookie) {
		response.cookies.set(LOCALE_COOKIE, requested, {
			path: "/",
			maxAge: 60 * 60 * 24 * 365,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		});
	}
	return response;
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
