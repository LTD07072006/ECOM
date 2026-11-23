import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test, type Response } from "@playwright/test";
import {
	VIETNAM_REPORT_TIME_ZONE,
	vietnamCalendarDay,
	vietnamDateRange,
} from "../../src/features/inquiries/reporting";
import { INQUIRY_NOTICE_VERSION } from "../../src/features/inquiries/privacy";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const stewardToken = process.env.E2E_RELEASE_STEWARD_TOKEN;
const referencePattern = /^INQ-\d{4}-[A-F0-9]{8}$/;

test("visitor can open Hanoi inquiry form and receive a reference code", async ({
	page,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto(baseUrl);
	await page.getByRole("textbox", { name: "Find a place" }).fill("Hà Nội");
	const [profileResponse] = await Promise.all([
		page.waitForResponse((response) =>
			/^\/api\/geographies\/[^/]+$/.test(new URL(response.url()).pathname),
		),
		page
			.getByRole("button", { name: "Hà Nội province · Việt Nam", exact: true })
			.click(),
	]);
	expect(profileResponse.ok()).toBe(true);

	const profile = page.getByTestId("geo-profile");
	await expect(profile.getByRole("heading", { name: "Hà Nội" })).toBeVisible();
	await profile
		.getByText("Request investment support", { exact: true })
		.click();
	await profile
		.getByRole("textbox", { name: "Email *" })
		.fill("pilot-e2e@example.test");
	await profile
		.getByRole("textbox", { name: "Message *" })
		.fill("E2E inquiry for logistics context in Hanoi.");
	const [notice] = await Promise.all([
		page.waitForEvent("popup"),
		profile.getByRole("link", { name: /inquiry privacy notice/ }).click(),
	]);
	await expect(
		notice.getByRole("heading", { name: "Inquiry privacy notice" }),
	).toBeVisible();
	await expect(notice.getByText(/12 months/)).toBeVisible();
	await notice.close();
	const consentBox = profile.getByRole("checkbox", { name: /I consent/ });
	await expect(consentBox).not.toBeChecked();
	await profile.getByRole("button", { name: "Send inquiry" }).click();
	await expect(consentBox).toBeFocused();
	await consentBox.check();
	const [response] = await Promise.all([
		page.waitForResponse(
			(result) =>
				new URL(result.url()).pathname === "/api/inquiries" &&
				result.request().method() === "POST",
		),
		profile.getByRole("button", { name: "Send inquiry" }).click(),
	]);

	expect(response.status()).toBe(201);
	const { referenceCode } = await response.json();
	expect(referenceCode).toMatch(referencePattern);
	await expect(profile.getByRole("status")).toContainText(referenceCode);
	await expect(
		profile.getByRole("button", { name: "Send inquiry" }),
	).toHaveCount(0);
	expect(errors).toEqual([]);
});

test("reports preview the selected week, download stored CSV, and compare compatible periods", async ({
	page,
	request,
}) => {
	test.skip(!stewardToken, "Set E2E_RELEASE_STEWARD_TOKEN for steward E2E.");
	test.setTimeout(150_000);
	const auth = { authorization: `Bearer ${stewardToken}` };
	const reportsUrl = `${baseUrl}/api/internal/inquiries/snapshots`;
	const catalog = await request.get(
		`${baseUrl}/api/geographies?q=ha+noi&level=province`,
	);
	expect(catalog.ok()).toBe(true);
	const { data: provinces } = (await catalog.json()) as {
		data: { code: string; id: string }[];
	};
	const hanoi = provinces.find(({ code }) => code === "01");
	expect(hanoi).toBeDefined();
	if (!hanoi) throw new Error("Expected Hanoi province");
	const country = `Report E2E ${randomUUID()}`;
	const hanoiId = hanoi.id;
	const submission = await request.post(`${baseUrl}/api/inquiries`, {
		data: {
			email: "reports-e2e@example.test",
			message: "Synthetic inquiry for the weekly report.",
			country,
			geographyIds: [hanoiId],
			consent: true,
			noticeVersion: INQUIRY_NOTICE_VERSION,
		},
	});
	expect(submission.status()).toBe(201);

	const now = new Date();
	const today = vietnamCalendarDay(now);
	const firstDay = vietnamCalendarDay(now, 6);
	const previous = vietnamDateRange(
		vietnamCalendarDay(now, 13),
		vietnamCalendarDay(now, 7),
	);
	async function createReferenceSnapshot(value: string) {
		const response = await request.post(reportsUrl, {
			headers: auth,
			data: {
				periodStart: previous.from,
				periodEnd: previous.to,
				timeZone: VIETNAM_REPORT_TIME_ZONE,
				filters: { country: value, geographyIds: [hanoiId] },
			},
		});
		expect(response.status()).toBe(201);
		return (await response.json()).data.snapshot_id as string;
	}
	const earlier = await createReferenceSnapshot(country);
	const incompatible = await createReferenceSnapshot(
		"Different country selection",
	);

	const origin = new URL(baseUrl).origin;
	const browserToken = "t".repeat(43);
	await page.route(
		(url) =>
			url.origin === origin &&
			url.pathname.startsWith("/api/internal/inquiries"),
		(route) => {
			const headers = route.request().headers();
			return headers.authorization === `Bearer ${browserToken}`
				? route.continue({ headers: { ...headers, ...auth } })
				: route.continue();
		},
	);
	await page.goto(`${baseUrl}/internal/inquiries`);
	await page.getByLabel("Steward token").fill(browserToken);
	await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
	await page.getByLabel("Quốc gia", { exact: true }).fill(country);
	await page.getByLabel("Từ ngày", { exact: true }).fill(firstDay);
	await page.getByLabel("Đến ngày", { exact: true }).fill(today);
	const search = page.getByLabel("Tìm địa bàn theo tên");
	await search.fill("Hà Nội");
	await search.press("Enter");
	await page.getByRole("button", { name: /^Hà Nội · tỉnh/ }).click();
	await expect(page.getByRole("button", { name: "Bỏ Hà Nội" })).toBeVisible();

	const preview = page.getByRole("region", { name: "Xem trước báo cáo" });
	const save = preview.getByRole("button", { name: "Lưu báo cáo" });
	await expect(save).toBeDisabled();
	await preview.getByRole("button", { name: "Xem trước", exact: true }).click();
	await expect(preview.getByText("1", { exact: true })).toBeVisible();
	await page.getByLabel("Quốc gia", { exact: true }).fill("Other selection");
	await expect(save).toBeDisabled();
	await page.getByLabel("Quốc gia", { exact: true }).fill(country);
	const isSaveResponse = (response: Response) =>
		response.url() === reportsUrl &&
		response.request().method() === "POST" &&
		response.request().postDataJSON()?.preview === false;
	const [saved] = await Promise.all([
		page.waitForResponse(isSaveResponse),
		save.click(),
	]);
	expect(saved.status()).toBe(201);
	const snapshot = (await saved.json()).data;
	expect(snapshot.metrics.total).toBe(1);
	expect(snapshot.time_zone).toBe(VIETNAM_REPORT_TIME_ZONE);

	const current = vietnamDateRange(firstDay, today);
	if (!current.from || !current.to)
		throw new Error("Expected valid date range");
	const format = new Intl.DateTimeFormat("vi-VN", {
		dateStyle: "medium",
		timeZone: VIETNAM_REPORT_TIME_ZONE,
	});
	const label = `${format.format(new Date(current.from))} – ${format.format(new Date(Date.parse(current.to) - 1))}`;
	const history = page.getByRole("region", { name: "Lịch sử theo kỳ" });
	const row = history.getByTestId(`snapshot-row-${snapshot.snapshot_id}`);
	async function openSavedReport() {
		const [response] = await Promise.all([
			page.waitForResponse(
				(result) =>
					result.url() === `${reportsUrl}/${snapshot.snapshot_id}` &&
					result.request().method() === "GET",
			),
			row.getByRole("button", { name: label, exact: true }).click(),
		]);
		expect(response.status()).toBe(200);
	}
	await openSavedReport();
	const detail = page.getByRole("article", { name: "Báo cáo đã chọn" });
	await expect(detail).toContainText(snapshot.snapshot_id);
	await expect(detail).toContainText("Địa bàn: Hà Nội");
	await expect(detail.getByRole("heading", { name: "Nhật ký" })).toBeVisible();

	const [download] = await Promise.all([
		page.waitForEvent("download"),
		row.getByRole("button", { name: "Tải bản đã lưu" }).click(),
	]);
	const csv = await readFile(await download.path(), "utf8");
	expect(csv).toContain(snapshot.snapshot_id);
	expect(csv).toContain(",total,1");
	expect(csv).not.toContain("reports-e2e@example.test");
	await openSavedReport();
	await expect(
		detail.getByText(
			/^(Đã xuất CSV|Đã xuất CSV trực tiếp) · (steward|[a-zA-Z0-9._-]+-steward)/,
		),
	).toBeVisible();

	const comparison = detail.getByRole("combobox", {
		name: "So sánh với báo cáo",
		exact: true,
	});
	await comparison.selectOption(earlier);
	await detail.getByRole("button", { name: "So sánh", exact: true }).click();
	const table = page.getByRole("region", { name: "Bảng so sánh" });
	const total = table
		.getByRole("row")
		.filter({ has: page.getByRole("rowheader", { name: "Tổng yêu cầu" }) });
	await expect(total.getByRole("cell")).toHaveText(["1", "0", "-1"]);

	await comparison.selectOption(incompatible);
	await detail.getByRole("button", { name: "So sánh", exact: true }).click();
	await expect(
		page.getByRole("list", { name: "Điều kiện báo cáo khác nhau" }),
	).toContainText("Quốc gia");
	await detail.getByRole("button", { name: "Tạo bản đính chính" }).click();
	await expect(
		preview.getByRole("button", { name: "Lưu bản đính chính" }),
	).toBeDisabled();
	await preview.getByRole("button", { name: "Xem trước", exact: true }).click();
	const [corrected] = await Promise.all([
		page.waitForResponse(isSaveResponse),
		preview.getByRole("button", { name: "Lưu bản đính chính" }).click(),
	]);
	expect(corrected.status()).toBe(201);
	expect((await corrected.json()).data.corrects_snapshot_id).toBe(
		snapshot.snapshot_id,
	);
	await page.setViewportSize({ width: 390, height: 844 });
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth),
	).toBeLessThanOrEqual(390);
});

test("steward dashboard refreshes the inquiry list, detail, and audit after saving", async ({
	page,
	request,
}) => {
	test.skip(!stewardToken, "Set E2E_RELEASE_STEWARD_TOKEN for steward E2E.");
	const catalog = await request.get(
		`${baseUrl}/api/geographies?q=ha+noi&level=province`,
	);
	expect(catalog.ok()).toBe(true);
	const { data: provinces } = (await catalog.json()) as {
		data: { code: string; id: string }[];
	};
	const hanoi = provinces.find(({ code }) => code === "01");
	expect(hanoi).toBeDefined();
	if (!hanoi) throw new Error("Expected Hanoi province");
	const sector = `E2E logistics ${randomUUID()}`;
	const message = "Steward E2E inquiry fixture for logistics.";
	const submitted = await request.post(`${baseUrl}/api/inquiries`, {
		data: {
			email: "steward-e2e@example.test",
			message,
			country: "+1",
			sector,
			geographyIds: [hanoi.id],
			consent: true,
			noticeVersion: INQUIRY_NOTICE_VERSION,
		},
	});
	expect(submitted.status()).toBe(201);
	const { referenceCode } = await submitted.json();
	expect(referenceCode).toMatch(referencePattern);

	const origin = new URL(baseUrl).origin;
	await page.route(
		(url) =>
			url.origin === origin &&
			url.pathname.startsWith("/api/internal/inquiries"),
		(route) =>
			route.continue({
				headers: {
					...route.request().headers(),
					authorization: `Bearer ${stewardToken}`,
				},
			}),
	);
	await page.goto(`${baseUrl}/internal/inquiries`);
	await page.getByLabel("Steward token").fill("t".repeat(43));
	await page.getByLabel("Lĩnh vực", { exact: true }).fill(sector);
	const load = page.getByRole("button", { name: "Tải danh sách" });
	await load.click();

	const list = page.getByRole("table", { name: "Danh sách yêu cầu" });
	const reference = list.getByRole("button", {
		name: referenceCode,
		exact: true,
	});
	const row = list.getByRole("row").filter({ hasText: referenceCode });
	await expect(row).toContainText("Mới");
	const [download] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Tải CSV an toàn" }).click(),
	]);
	const csv = await readFile(await download.path());
	expect(Array.from(csv.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
	expect(csv.toString("utf8")).toContain(`,"'+1",${sector},`);
	expect(csv.toString("utf8")).not.toContain("steward-e2e@example.test");
	await expect(reference).toBeEnabled();
	await reference.click();
	const detail = page.getByRole("article").filter({
		has: page.getByRole("heading", { name: referenceCode, exact: true }),
	});
	await expect(detail).toContainText(message);

	await detail
		.getByLabel("Ghi chú nội bộ")
		.fill("Note saved without changing status.");
	const save = detail.getByRole("button", { name: "Lưu cập nhật" });
	await save.click();
	await expect(
		detail.getByText(/Đã thêm ghi chú.*Note saved without changing status/),
	).toBeVisible();
	await expect(row).toContainText("Mới");

	await detail
		.getByRole("combobox", { name: "Cập nhật trạng thái", exact: true })
		.selectOption("contacted");
	await save.click();
	await expect(
		detail.getByText("Trạng thái: Đã liên hệ", { exact: true }),
	).toBeVisible();
	await expect(
		detail.getByText(/Đổi trạng thái.*Mới → Đã liên hệ/),
	).toBeVisible();
	await expect(row).toContainText("Đã liên hệ");

	await page
		.getByRole("combobox", { name: "Trạng thái", exact: true })
		.selectOption("new");
	await load.click();
	await expect(page.getByRole("status")).toHaveText("Không có yêu cầu nào.");
	await expect(reference).toHaveCount(0);
	await expect(detail).toHaveCount(0);
});
