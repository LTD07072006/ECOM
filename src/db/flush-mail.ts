import "dotenv/config";
import { databasePool } from "./pool";
import { flushPendingNotifications } from "../features/inquiries/notifications";

function parseArgs(argv: string[]) {
	let dryRun = false;
	let limit = 50;
	for (const arg of argv) {
		if (arg === "--dry-run") {
			dryRun = true;
		} else if (arg.startsWith("--limit=")) {
			const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
			if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) {
				throw new Error(
					"Usage: bun run mail:flush [--dry-run] [--limit=1..500]",
				);
			}
			limit = parsed;
		} else {
			throw new Error("Usage: bun run mail:flush [--dry-run] [--limit=1..500]");
		}
	}
	return { dryRun, limit };
}

try {
	const options = parseArgs(process.argv.slice(2));
	const summary = await flushPendingNotifications(options);
	console.log(JSON.stringify(summary));
} catch (error) {
	console.error(
		error instanceof Error
			? error.message
			: "Failed to flush inquiry notifications.",
	);
	process.exitCode = 1;
} finally {
	await databasePool().end();
}
