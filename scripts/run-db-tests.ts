const proc = Bun.spawnSync(
	[
		process.execPath,
		"test",
		"tests/db/database.integration.test.ts",
		"tests/features/geography/database-repository.test.ts",
		"tests/features/geography/database-integrity.test.ts",
	],
	{
		env: { ...process.env, RUN_DB_TESTS: "1" },
		stdout: "inherit",
		stderr: "inherit",
	},
);

process.exit(proc.exitCode);
