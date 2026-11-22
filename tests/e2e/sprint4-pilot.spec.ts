import { expect, test } from "@playwright/test";
import type { MultiPolygon, Polygon, Position } from "geojson";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

test("mobile and reduced-motion users can use keyboard search with visible focus and status", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(baseUrl);
  const search = page.getByRole("textbox", { name: "Find a place" });
  await search.focus();
  await expect(search).toBeFocused();
  await expect(search).toHaveCSS("outline-style", "solid");
  await search.fill("zzzzdoesnotexist");
  await expect(page.getByRole("status").filter({ hasText: "No matching places." })).toBeVisible();
  await search.fill("ha noi");
  const place = page.getByRole("button", { name: "Hà Nội province · Việt Nam", exact: true });
  await expect(place).toBeVisible();
  await search.press("Tab");
  await expect(place).toBeFocused();
  await place.press("Enter");
  await expect(page.getByTestId("geo-profile")).toContainText("Hà Nội");
  await expect(page.getByRole("status").filter({ hasText: "Profile loaded for Hà Nội." })).toBeVisible();
  await expect(search).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("MapLibre renders the published province map with three times as many vertices", async ({ page }) => {
  const JSerrors: string[] = [];
  page.on("pageerror", (error) => JSerrors.push(error.message));
  let expanded = false;
  await page.route("**/api/map/provinces", async (route) => {
    const response = await route.fetch();
    const payload: { data: { features: { geometry: Polygon | MultiPolygon }[] } } = await response.json();
    const densify = (ring: Position[]) => ring.flatMap((point, index) => {
      const next = ring[index + 1];
      if (!next) return [point];
      return [point, [point[0] * 2 / 3 + next[0] / 3, point[1] * 2 / 3 + next[1] / 3],
        [point[0] / 3 + next[0] * 2 / 3, point[1] / 3 + next[1] * 2 / 3]];
    });
    for (const { geometry } of payload.data.features) {
      geometry.coordinates = geometry.type === "Polygon"
        ? geometry.coordinates.map(densify)
        : geometry.coordinates.map((polygon) => polygon.map(densify));
    }
    expanded = payload.data.features.length === 34;
    await route.fulfill({ json: payload });
  });
  await page.goto(baseUrl);
  await expect(page.locator(".province-map")).toHaveAttribute("data-map-status", "ready", { timeout: 25_000 });
  await expect(page.getByText("34 of 34 provincial boundaries published.")).toBeVisible();
  expect(expanded).toBe(true);
  expect(JSerrors).toEqual([]);
});

test("the internal page keeps data behind its role gate and supports reviewer keyboard access", async ({ page }) => {
  const token = process.env.E2E_RELEASE_REVIEWER_TOKEN;
  test.skip(!token, "Set a disposable reviewer token for the browser test.");
  await page.goto(new URL("/internal/releases", baseUrl).href);
  await expect(page.getByRole("heading", { name: "Độ mới của bộ dữ liệu" })).toHaveCount(0);
  const field = page.getByLabel("Token truy cập phát hành");
  await field.fill("x".repeat(43));
  await field.press("Enter");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("A valid release access token is required.");
  await page.route("**/api/internal/releases", (route) => route.continue({
    headers: { ...route.request().headers(), authorization: `Bearer ${token}` },
  }));
  await field.fill("v".repeat(43));
  await field.press("Enter");
  await expect(page.getByRole("heading", { name: "Độ mới của bộ dữ liệu" })).toBeVisible();
  await expect(page.getByText(/Đăng nhập với .*reviewer/i)).toBeVisible();
  await expect(page.getByText("VN_ADMIN_CATALOG")).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(field).toBeVisible();
  await expect(field).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Độ mới của bộ dữ liệu" })).toHaveCount(0);
});
