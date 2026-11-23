"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { InquiryDialog } from "../features/inquiries/InquiryDialog";
import { useI18n } from "../lib/i18n/provider";
import { LocaleSwitcher } from "../lib/i18n/switcher";

export function SiteHeader() {
	const { t } = useI18n();
	const pathname = usePathname() ?? "/";
	const isInternal =
		pathname === "/internal" || pathname.startsWith("/internal/");

	function focusMain() {
		const main = document.querySelector("main");
		if (main instanceof HTMLElement) {
			if (!main.hasAttribute("tabindex")) {
				main.setAttribute("tabindex", "-1");
			}
			main.focus();
		}
	}

	return (
		<>
			<button type="button" className="skip-link" onClick={focusMain}>
				{t("common.skipToMain")}
			</button>
			<header
				className={`site-header ${
					isInternal ? "site-header--internal" : "site-header--public"
				}`}
			>
				<div className="site-header-inner">
					{pathname === "/" ? (
						<h1 className="site-brand-heading">
							<Link href="/" className="site-brand">
								{t("home.title")}
							</Link>
						</h1>
					) : (
						<Link href="/" className="site-brand">
							{t("home.title")}
						</Link>
					)}
					<nav className="site-nav" aria-label={t("nav.mainAria")}>
						{isInternal ? (
							<>
								<Link
									href="/internal/inquiries"
									className="site-nav-link"
									aria-current={
										pathname.startsWith("/internal/inquiries")
											? "page"
											: undefined
									}
								>
									{t("meta.adminInquiriesTitle")}
								</Link>
								<Link
									href="/internal/releases"
									className="site-nav-link"
									aria-current={
										pathname.startsWith("/internal/releases")
											? "page"
											: undefined
									}
								>
									{t("meta.releaseTitle")}
								</Link>
								<Link href="/" className="site-nav-link">
									{t("nav.map")}
								</Link>
							</>
						) : (
							<>
								<Link
									href="/"
									className="site-nav-link"
									aria-current={pathname === "/" ? "page" : undefined}
								>
									{t("nav.map")}
								</Link>
								<Link
									href="/decision"
									className="site-nav-link"
									aria-current={
										pathname.startsWith("/decision") ? "page" : undefined
									}
								>
									{t("home.decisionLink")}
								</Link>
								<Link
									href="/investor-guide"
									className="site-nav-link"
									aria-current={
										pathname.startsWith("/investor-guide") ? "page" : undefined
									}
								>
									{t("nav.investorGuide")}
								</Link>
								<Link
									href="/inquiries/status"
									className="site-nav-link"
									aria-current={
										pathname.startsWith("/inquiries/status")
											? "page"
											: undefined
									}
								>
									{t("status.pageLink")}
								</Link>
							</>
						)}
					</nav>
					<div className="site-header-actions">
						<LocaleSwitcher />
						{!isInternal && (
							<InquiryDialog
								geographyIds={[]}
								trigger={t("nav.requestSupport")}
								triggerClassName="btn btn-cta"
							/>
						)}
					</div>
				</div>
			</header>
		</>
	);
}
