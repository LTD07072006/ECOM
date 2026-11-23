import { expect, test } from "bun:test";

const posixTest = process.platform === "win32" ? test.skip : test;

async function closedLoopbackPort() {
	const server = Bun.listen({
		hostname: "127.0.0.1",
		port: 0,
		socket: {
			data() {},
		},
	});
	const { port } = server;
	server.stop(true);
	return port;
}

async function waitForChildFailure(
	stream: ReadableStream<Uint8Array>,
	timeoutMs = 3_000,
) {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let output = "";
	const deadline = Date.now() + timeoutMs;
	try {
		while (Date.now() < deadline) {
			const remaining = deadline - Date.now();
			const chunk = await Promise.race([
				reader.read(),
				Bun.sleep(remaining).then(() => null),
			]);
			if (!chunk || chunk.done) break;
			output += decoder.decode(chunk.value, { stream: true });
			if (/retention_failed|ECONNREFUSED|Failed|connect/i.test(output)) break;
		}
	} finally {
		await reader.cancel().catch(() => {});
	}
}

for (const script of [
	"src/db/retention-scheduler.ts",
	"src/db/mail-scheduler.ts",
]) {
	posixTest(
		`${script} exits promptly on SIGTERM while sleeping`,
		async () => {
			const port = await closedLoopbackPort();
			const proc = Bun.spawn([process.execPath, "run", script], {
				env: {
					...process.env,
					DATABASE_URL: `postgresql://market_entry:test@127.0.0.1:${port}/market_entry`,
					NODE_ENV: "development",
				},
				stdout: "ignore",
				stderr: "pipe",
			});
			try {
				await waitForChildFailure(proc.stderr);
				await Bun.sleep(100);
				const started = performance.now();
				proc.kill("SIGTERM");
				const exitCode = await Promise.race([
					proc.exited,
					Bun.sleep(3_000).then(() => null),
				]);
				expect(exitCode).toBe(0);
				expect(performance.now() - started).toBeLessThan(3_000);
			} finally {
				if (proc.exitCode === null) proc.kill("SIGKILL");
			}
		},
		10_000,
	);
}

posixTest(
	"retention-scheduler forwards SIGTERM to an active child and exits promptly",
	async () => {
		let markConnected: (() => void) | undefined;
		const connected = new Promise<void>((resolve) => {
			markConnected = resolve;
		});
		const server = Bun.listen({
			hostname: "127.0.0.1",
			port: 0,
			socket: {
				open() {
					markConnected?.();
				},
				data() {},
			},
		});
		const proc = Bun.spawn(
			[process.execPath, "run", "src/db/retention-scheduler.ts"],
			{
				env: {
					...process.env,
					DATABASE_URL: `postgresql://market_entry:test@127.0.0.1:${server.port}/market_entry`,
					NODE_ENV: "development",
				},
				stdout: "ignore",
				stderr: "ignore",
			},
		);
		try {
			await Promise.race([connected, Bun.sleep(3_000)]);
			await Bun.sleep(50);
			const started = performance.now();
			proc.kill("SIGTERM");
			const exitCode = await Promise.race([
				proc.exited,
				Bun.sleep(3_000).then(() => null),
			]);
			expect(exitCode).toBe(0);
			expect(performance.now() - started).toBeLessThan(3_000);
		} finally {
			if (proc.exitCode === null) proc.kill("SIGKILL");
			server.stop(true);
		}
	},
	10_000,
);
