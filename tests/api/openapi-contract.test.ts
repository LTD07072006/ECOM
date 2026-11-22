import { expect, test } from "bun:test";
import { Glob } from "bun";

function routeFileToOpenApiPath(filePath: string) {
	const normalized = filePath.replace(/\\/g, "/");
	const withoutPrefix = normalized
		.replace(/^src\/app/, "")
		.replace(/\/route\.ts$/, "");
	return withoutPrefix.replace(/\[([^\]]+)\]/g, "{$1}");
}

test("docs/openapi.yaml documents every runtime /api route, HTTP method, security scheme, and schema (ECOM-34)", async () => {
	const specText = await Bun.file("docs/openapi.yaml").text();
	expect(specText).toContain("openapi: 3.1.0");
	expect(specText).toContain("operatorToken:");
	expect(specText).toContain("cookieAuth:");
	expect(specText).toContain("schemas:");

	const glob = new Glob("src/app/api/**/route.ts");
	const routeFiles: string[] = [];
	for await (const file of glob.scan(".")) {
		routeFiles.push(file);
	}
	expect(routeFiles.length).toBeGreaterThanOrEqual(18);

	for (const file of routeFiles) {
		const apiPath = routeFileToOpenApiPath(file);
		expect(specText).toContain(`  ${apiPath}:`);

		const source = await Bun.file(file).text();
		const exportedMethods = [
			...source.matchAll(
				/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g,
			),
		].map((match) => match[1].toLowerCase());
		expect(exportedMethods.length).toBeGreaterThan(0);

		const pathIdx = specText.indexOf(`  ${apiPath}:`);
		const nextPathMatch = specText
			.slice(pathIdx + apiPath.length + 4)
			.match(/\n {2}\/api\//);
		const block = nextPathMatch
			? specText.slice(
					pathIdx,
					pathIdx + apiPath.length + 4 + (nextPathMatch.index ?? 0),
				)
			: specText.slice(pathIdx);

		for (const method of exportedMethods) {
			expect(block).toContain(`    ${method}:`);
		}
	}
});
