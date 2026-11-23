import { type ChildProcess, spawn } from "node:child_process";

const defaultIntervalMs = 60_000;
const defaultErrorBackoffMs = 300_000;

function parseInterval(raw: string | undefined, fallback: number): number {
	const parsed = Number.parseInt(raw ?? "", 10);
	return Number.isFinite(parsed) && parsed >= 5_000 ? parsed : fallback;
}

const intervalMs = parseInterval(
	process.env.ECOM_MAIL_FLUSH_INTERVAL_MS,
	defaultIntervalMs,
);
const errorBackoffMs = parseInterval(
	process.env.ECOM_MAIL_ERROR_BACKOFF_MS,
	defaultErrorBackoffMs,
);

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

async function runFlush() {
	return new Promise<number>((resolve) => {
		const child = spawn(process.execPath, ["run", "src/db/flush-mail.ts"], {
			stdio: "inherit",
		});
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
	const result = await runFlush();
	if (stopping) break;
	await Bun.sleep(result === 0 ? intervalMs : errorBackoffMs);
}
