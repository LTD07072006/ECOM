import { spawn } from "node:child_process";

async function runCleanup() {
	return new Promise<number>((resolve) => {
		const child = spawn(
			process.execPath,
			["run", "src/db/cleanup-inquiries.ts", "--apply"],
			{ stdio: "inherit" },
		);
		child.on("error", () => resolve(1));
		child.on("exit", (code) => resolve(code ?? 1));
	});
}

while (true) {
	const result = await runCleanup();
	// Retry failed jobs in an hour and run successful jobs daily.
	await Bun.sleep(result === 0 ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);
}
