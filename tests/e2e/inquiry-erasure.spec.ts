import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { INQUIRY_NOTICE_VERSION } from "../../src/features/inquiries/privacy";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const stewardToken = process.env.E2E_RELEASE_STEWARD_TOKEN;
const referencePattern = /^INQ-\d{4}-[A-F0-9]{8}$/;

test("steward can anonymize an inquiry by privacy request with a ticket reference", async ({
	page,
	request,
}) => {
	test.skip(!stewardToken, "Set E2E_RELEASE_STEWARD_TOKEN for steward E2E.");
	if (!stewardToken) return;

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

	const sector = `E2E erasure ${randomUUID()}`;
	const email = "erasure-e2e@example.test";
	const message = "Synthetic E2E inquiry for privacy erasure request.";
	const submitted = await request.post(`${baseUrl}/api/inquiries`, {
		data: {
			email,
			message,
			sector,
			geographyIds: [hanoi.id],
			consent: true,
			noticeVersion: INQUIRY_NOTICE_VERSION,
		},
	});
	expect(submitted.status()).toBe(201);
	const { referenceCode } = (await submitted.json()) as {
		referenceCode: string;
	};
	expect(referenceCode).toMatch(referencePattern);

	await page.goto(`${baseUrl}/internal/inquiries`);
	await page.getByLabel("Steward token").fill(stewardToken);
	await page.getByRole("button", { name: "Đăng nhập phiên (cookie)" }).click();
	await expect(page.getByText(/Đang đăng nhập:/)).toBeVisible();

	await page.getByLabel("Lĩnh vực", { exact: true }).fill(sector);
	await page.getByRole("button", { name: "Tải danh sách" }).click();

	const list = page.getByRole("table", { name: "Danh sách yêu cầu" });
	await list.getByRole("button", { name: referenceCode, exact: true }).click();

	const detail = page.getByRole("article").filter({
		has: page.getByRole("heading", { name: referenceCode, exact: true }),
	});
	await expect(detail).toContainText(email);
	await expect(detail).toContainText(message);

	const privacySection = detail.getByRole("region", {
		name: "Yêu cầu quyền riêng tư",
	});
	await privacySection.getByLabel("Lý do").selectOption("erasure_request");
	await privacySection.getByLabel("Mã ticket").fill("DSAR-E2E-001");

	page.once("dialog", (dialog) => dialog.accept());
	const [erasureResponse] = await Promise.all([
		page.waitForResponse(
			(response) =>
				new URL(response.url()).pathname ===
					`/api/internal/inquiries/${referenceCode}/erasure` &&
				response.request().method() === "POST",
		),
		privacySection
			.getByRole("button", { name: "Ẩn danh dữ liệu cá nhân" })
			.click(),
	]);
	expect(erasureResponse.status()).toBe(200);

	await expect(
		detail.getByText("Yêu cầu này đã được ẩn danh theo chính sách lưu trữ."),
	).toBeVisible();
	await expect(detail).not.toContainText(email);
	await expect(detail).not.toContainText(message);
	await expect(privacySection).toHaveCount(0);
	await expect(detail.getByText(/Đã ẩn danh · /)).toBeVisible();
});
