import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

test("published Sprint 1 release is visible through the real browser data flow", async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.getByRole("heading", { name: "Vietnam Market Intelligence" })).toBeVisible();
  await expect(page.locator(".province-map")).toHaveAttribute("data-map-status", "ready");
  await expect(page.getByRole("status").filter({ hasText: "Loading" })).toHaveCount(0);
  await expect(page.getByText("34 of 34 provincial boundaries published.")).toBeVisible();

  const search = page.getByLabel("Find a place");
  await search.fill("ha noi");
  await page.getByRole("button", { name: "Hà Nội province · Việt Nam", exact: true }).click();

  const profile = page.getByTestId("geo-profile");
  await expect(profile).toContainText("Hà Nội");
  await expect(profile).toContainText("8,857,526 people");
  await expect(profile).toContainText("Average population");
  await expect(profile).not.toContainText("Population context");
});

test("Wave 2 layer controls and comparison use published sources", async ({ page }) => {
  await page.goto(baseUrl);
  const layerControl = page.getByLabel("Colour provinces by");
  await expect(layerControl.locator("option").filter({ hasText: "GRDP per capita" })).toHaveCount(1);
  await layerControl.selectOption({ label: "GRDP growth · 2025 (estimated) · PL.V03.01-2025" });
  await expect(page.getByLabel("Indicator legend")).toContainText("34 of 34 provinces");
  await page.getByLabel("Civil airports").check();
  await expect(page.getByText("22 reference points")).toBeVisible();
  await page.getByLabel("Find a place").fill("ha noi");
  await page.getByRole("button", { name: "Hà Nội province · Việt Nam", exact: true }).click();
  await page.getByText("Compare sources", { exact: true }).click();
  await expect(page.getByText("Second minus first:", { exact: false })).toBeVisible();
  const select = page.getByLabel("Second source");
  const fdi = await select.locator("option").filter({ hasText: "Licensed FDI" }).getAttribute("value");
  await select.selectOption(fdi!);
  await expect(page.getByText("Numeric comparison requires", { exact: false })).toBeVisible();
});

test("province map reaches ready state after repeated production reloads", async ({ page }) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.goto(baseUrl);
    await expect(page.locator(".province-map")).toHaveAttribute("data-map-status", "ready", { timeout: 10000 });
  }
});
