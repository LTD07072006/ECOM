import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("root body tolerates browser-extension attributes during hydration", () => {
	const layout = readFileSync("src/app/layout.tsx", "utf8");
	expect(layout).toContain("<body");
	expect(layout).toContain("suppressHydrationWarning");
});
