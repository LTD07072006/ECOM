import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

test("home page exposes the investor map workspace", () => {
  const pagePath = "src/app/page.tsx";

  expect(existsSync(pagePath)).toBe(true);

  const page = readFileSync(pagePath, "utf8");
  expect(page).toContain("Vietnam Market Intelligence");
  expect(page).toContain("map-workspace");
});
