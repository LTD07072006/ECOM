import { type ChildProcess, spawn } from "node:child_process";

let stopping = false;
let activeChild: ChildProcess | null = null;

function handleSignal() {
	stopping = true;
	if (!activeChild) {
		process.exit(0);
	}
}

process.on("SIGINT", handleSignal);
process.on("SIGTERM", handleSignal);

async function runCleanup() {
	return new Promise<number>((resolve) => {
		const child = spawn(
			process.execPath,
			["run", "src/db/cleanup-inquiries.ts", "--apply"],
			{ stdio: "inherit" },
		);
		activeChild = child;
		let settled = false;
		const finish = (code: number) => {
			if (settled) return;
			settled = true;
			if (activeChild === child) {
				activeChild = null;
			}
			resolve(code);
		};
		child.on("error", () => finish(1));
		child.on("exit", (code) => finish(code ?? 1));
	});
}

while (!stopping) {
	const result = await runCleanup();
	if (stopping) break;
	// Retry failed jobs in an hour and run successful jobs daily.
	await Bun.sleep(result === 0 ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);
}
