import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

test("filters provinces by a published indicator and restores the shared view", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(baseUrl);

  const layerSelect = page.getByLabel("Colour provinces by");
  const layerId = await layerSelect.evaluate((select) => {
    const option = [...(select as HTMLSelectElement).options].find((item) => item.textContent?.includes("Average population"));
    return option?.value ?? "";
  });
  expect(layerId).not.toBe("");
  await layerSelect.selectOption(layerId);

  const filter = page.getByRole("group", { name: "Filter provinces by value" });
  await filter.getByLabel("At least").fill("5000000");

  const summary = filter.getByRole("status");
  await expect(summary).toContainText("of 34 provinces match");
  await expect(summary).toContainText("have no data");
  const matched = Number((await summary.innerText()).split(" ")[0]);
  expect(matched).toBeGreaterThan(0);
  expect(matched).toBeLessThan(34);

  await expect(page).toHaveURL(/layer=/);
  await expect(page).toHaveURL(/min=5000000/);

  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Link copied.")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("layer=");
  expect(copied).toContain("min=5000000");

  await page.reload();
  await expect(page.getByLabel("Colour provinces by")).toHaveValue(layerId);
  const restored = page.getByRole("group", { name: "Filter provinces by value" });
  await expect(restored.getByLabel("At least")).toHaveValue("5000000");
  await expect(restored.getByRole("status")).toContainText("of 34 provinces match");

  await restored.getByRole("button", { name: "Clear filter" }).click();
  await expect(restored.getByLabel("At least")).toHaveValue("");
  await expect(page).not.toHaveURL(/min=/);
});

test("rejects inverted bounds without writing them to the URL", async ({ page }) => {
  await page.goto(baseUrl);
  const layerSelect = page.getByLabel("Colour provinces by");
  const layerId = await layerSelect.evaluate((select) => {
    const option = [...(select as HTMLSelectElement).options].find((item) => item.textContent?.includes("Average population"));
    return option?.value ?? "";
  });
  await layerSelect.selectOption(layerId);

  const filter = page.getByRole("group", { name: "Filter provinces by value" });
  await filter.getByLabel("At least").fill("9000000");
  await filter.getByLabel("At most").fill("1000");
  await expect(filter.getByRole("alert")).toContainText("must not be greater than");
  await expect(page).not.toHaveURL(/min=/);

  await filter.getByLabel("At least").fill("");
  await expect(filter.getByRole("status")).toContainText("of 34 provinces match");
});

test("retains a shared province and unrelated query parameters while a profile loads", async ({ page, request }) => {
  const search = await request.get(`${baseUrl}/api/geographies?q=ha%20noi&level=province`);
  expect(search.ok()).toBe(true);
  const { data } = await search.json();
  const id = data.find((place: { displayName: string }) => place.displayName === "Hà Nội").id;
  let releaseProfile = () => {};
  const waiting = new Promise<void>((resolve) => { releaseProfile = resolve; });
  await page.route(`**/api/geographies/${id}`, async (route) => {
    await waiting;
    await route.continue();
  });
  try {
    await page.goto(`${baseUrl}/?province=${id}&campaign=pilot`);
    await page.getByLabel("Civil airports").check();
    await expect(page).toHaveURL(new RegExp(`province=${id}`));
    await expect(page).toHaveURL(/campaign=pilot/);
  } finally {
    releaseProfile();
  }
  await expect(page.getByTestId("geo-profile")).toContainText("Hà Nội");
});
