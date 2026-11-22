import { expect, test } from "@playwright/test";
const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

test("builds and compares regions through accessible search", async ({ page }) => {
  await page.goto(baseUrl);
  await page.getByRole("button", { name: "Show regional comparison" }).click();
  const search = page.getByLabel("Find a place");
  await search.fill("ha noi");
  await page.getByRole("button", { name: "Hà Nội province · Việt Nam", exact: true }).click();
  await expect(page.getByTestId("geo-profile")).toContainText("Hà Nội");
  await page.getByRole("button", { name: "Add current province" }).click();
  await expect(page.getByRole("button", { name: "Remove Hà Nội" })).toBeVisible();
  await page.getByLabel("Region B", { exact: true }).check();
  await search.fill("da nang");
  await page.getByRole("button", { name: "Đà Nẵng province · Việt Nam", exact: true }).click();
  await expect(page.getByTestId("geo-profile")).toContainText("Đà Nẵng");
  await page.getByRole("button", { name: "Add current province" }).click();
  await expect(page.getByRole("button", { name: "Remove Đà Nẵng" })).toBeVisible();
  await expect(page.getByText("Difference B − A", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Clear regions" }).click();
  await expect(page.getByRole("button", { name: "Remove Hà Nội" })).toHaveCount(0);
});
