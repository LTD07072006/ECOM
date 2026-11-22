import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const suite = process.argv[2];
const workflowTest = "tests/db/release-workflow.integration.test.ts";
const mode: NodeJS.ProcessEnv = {
	...process.env,
	NODE_ENV: "test",
	ECOM_TRUSTED_PROXY_TOKEN: "",
};
const temp = await mkdtemp(join(tmpdir(), "ecom-release-tests-"));
const tokenPattern = /^[A-Za-z0-9_-]{43,128}$/;

function requireTokens(steward?: string, reviewer?: string) {
	if (
		!steward ||
		!reviewer ||
		steward === reviewer ||
		!tokenPattern.test(steward) ||
		!tokenPattern.test(reviewer)
	) {
		throw new Error(
			"Set distinct disposable steward and reviewer tokens before running release tests.",
		);
	}
}

function requireDatabase(prefix: string) {
	const url = new URL(process.env.DATABASE_URL ?? "about:blank");
	if (
		!["postgres:", "postgresql:"].includes(url.protocol) ||
		url.hostname !== "127.0.0.1" ||
		!new RegExp(`^/${prefix}[a-z0-9_]+$`).test(url.pathname)
	) {
		throw new Error(
			`Release tests require a disposable database on 127.0.0.1 with a name starting with ${prefix}.`,
		);
	}
}

async function run(args: string[], env: NodeJS.ProcessEnv = mode) {
	const child = Bun.spawn([process.execPath, "--no-env-file", ...args], {
		env,
		stdout: "inherit",
		stderr: "inherit",
	});
	if ((await child.exited) !== 0) throw new Error("Release tests failed.");
}

try {
	if (suite === "db" || suite === "workflow") {
		requireDatabase(
			suite === "db" ? "ecom_inquiry_it_" : "ecom_sprint4_workflow_",
		);
		if (suite === "db")
			requireTokens(mode.RELEASE_STEWARD_TOKEN, mode.RELEASE_REVIEWER_TOKEN);
		const dbTests = [...new Bun.Glob("tests/db/*.test.ts").scanSync()].map(
			(file) => file.replaceAll("\\", "/"),
		);
		const report = join(temp, "bun.xml");
		const tests =
			suite === "workflow"
				? [workflowTest]
				: [
						"tests/api",
						"tests/features",
						"tests/smoke",
						...dbTests.filter((file) => file !== workflowTest),
					];
		await run(
			[
				"test",
				"--timeout",
				"15000",
				"--reporter=junit",
				`--reporter-outfile=${report}`,
				...tests,
			],
			{
				...mode,
				RUN_DB_TESTS: "1",
				RUN_INQUIRY_DB_TESTS: "1",
				RUN_RELEASE_WORKFLOW_TESTS: "1",
			},
		);
		const result = await Bun.file(report).text();
		if (
			!/\btests="[1-9]\d*"/.test(result) ||
			/\bskipped="[1-9]\d*"|<skipped\b/.test(result)
		) {
			throw new Error("Release suite ran no tests or skipped required tests.");
		}
	} else if (suite === "e2e") {
		requireTokens(
			mode.E2E_RELEASE_STEWARD_TOKEN,
			mode.E2E_RELEASE_REVIEWER_TOKEN,
		);
		const base = new URL(mode.E2E_BASE_URL ?? "about:blank");
		if (
			base.protocol !== "http:" ||
			base.hostname !== "127.0.0.1" ||
			!base.port ||
			base.pathname !== "/"
		) {
			throw new Error(
				"Set E2E_BASE_URL to the isolated preview on http://127.0.0.1:<port>.",
			);
		}
		const report = join(temp, "playwright.json");
		await run(
			[
				"x",
				"--no-install",
				"playwright",
				"test",
				"tests/e2e",
				"--forbid-only",
				"--fail-on-flaky-tests",
				"--reporter=line,json",
			],
			{
				...mode,
				PLAYWRIGHT_JSON_OUTPUT_FILE: report,
			},
		);
		const { stats } = await Bun.file(report).json();
		if (
			!stats ||
			!stats.expected ||
			stats.skipped ||
			stats.unexpected ||
			stats.flaky
		) {
			throw new Error(
				"Required browser tests did not all pass on their first run.",
			);
		}
	} else {
		throw new Error("Usage: bun run test:release <db|workflow|e2e>");
	}
} catch (cause) {
	console.error(
		cause instanceof Error ? cause.message : "Release checks failed.",
	);
	process.exitCode = 1;
} finally {
	await rm(temp, { recursive: true, force: true });
}
