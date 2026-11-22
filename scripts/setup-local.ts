import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const setupOnly = process.argv.slice(2).includes("--setup-only");
const bun = process.execPath;
const localEnvironment = { ...process.env, NODE_ENV: "development" };
const randomToken = () => randomBytes(32).toString("base64url");

async function run(
	command: string[],
	message: string,
	environment = localEnvironment,
) {
	console.log(message);
	const child = Bun.spawn(command, {
		env: environment,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	const code = await child.exited;
	if (code !== 0) process.exit(code);
}

async function createLocalSettings() {
	const port = process.env.ECOM_DB_PORT || "55432";
	if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
		throw new Error("ECOM_DB_PORT must be a valid port number.");
	}
	const password = randomToken();
	const settings = [
		`POSTGRES_PASSWORD=${password}`,
		`DATABASE_URL=postgresql://market_entry:${password}@127.0.0.1:${port}/market_entry`,
		`RELEASE_REVIEWER_TOKEN=${randomToken()}`,
		`RELEASE_STEWARD_TOKEN=${randomToken()}`,
		"REQUIRE_RELEASE_APPROVAL=0",
	];
	try {
		await writeFile(".env", `${settings.join("\n")}\n`, {
			flag: "wx",
			mode: 0o600,
		});
		console.log("Created local credentials in .env.");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
		console.log("Using existing .env.");
	}
}

await run(
	["docker", "info", "--format", "{{.OSType}}"],
	"Checking Docker Engine. Start Docker Desktop first on Windows or macOS.",
);
await run(
	[bun, "install", "--frozen-lockfile"],
	"Installing pinned dependencies.",
);
await createLocalSettings();

const { parse } = await import("dotenv");
const settings = parse(await readFile(".env"));
const database =
	settings.DATABASE_URL && URL.canParse(settings.DATABASE_URL)
		? new URL(settings.DATABASE_URL)
		: null;
if (
	!database ||
	!["postgres:", "postgresql:"].includes(database.protocol) ||
	database.hostname !== "127.0.0.1" ||
	!database.port ||
	database.pathname !== "/market_entry" ||
	database.username !== "market_entry" ||
	!settings.POSTGRES_PASSWORD ||
	decodeURIComponent(database.password) !== settings.POSTGRES_PASSWORD
) {
	throw new Error(
		"Use matching local PostgreSQL credentials in .env. See the README for existing volumes.",
	);
}
if (settings.REQUIRE_RELEASE_APPROVAL === "1") {
	throw new Error(
		"This command is for local bootstrap. Use the approved release workflow for this environment.",
	);
}
const environment = {
	...localEnvironment,
	...settings,
	NODE_ENV: "development",
	ECOM_DB_PORT: database.port,
};
await run(
	[
		"docker",
		"compose",
		"--env-file",
		".env",
		"up",
		"-d",
		"--wait",
		"--wait-timeout",
		"120",
		"db",
	],
	"Starting local PostGIS.",
	environment,
);
await run([bun, "run", "db:migrate"], "Applying migrations.", environment);
await run(
	[bun, "run", "db:import", "--publish"],
	"Loading published administration and boundaries.",
	environment,
);
await run(
	[bun, "run", "db:import:wave2", "--publish"],
	"Loading published Wave 2 data.",
	environment,
);
await run(
	[bun, "run", "db:check"],
	"Checking the local database.",
	environment,
);
if (!setupOnly)
	await run(
		[bun, "run", "dev", "--hostname", "127.0.0.1"],
		"Starting the local app. Open the URL shown by Next.js.",
		environment,
	);
