import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { en } from "../../src/lib/i18n/en";
import { vi } from "../../src/lib/i18n/vi";

test("home page exposes the investor map workspace", () => {
  const pagePath = "src/app/page.tsx";

  expect(existsSync(pagePath)).toBe(true);

  const page = readFileSync(pagePath, "utf8");
  expect(page).toContain('t("home.title")');
  expect(page).toContain("map-workspace");
  expect(en["home.title"]).toBe("Vietnam Market Intelligence");
  expect(vi["home.title"]).toBe("Vietnam Market Intelligence");
});
