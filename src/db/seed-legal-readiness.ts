import { databasePool } from "./pool";
import { seedDefaultLegalReadiness } from "../features/decision/legal-readiness-repository";

try {
	const result = await seedDefaultLegalReadiness();
	console.info(
		JSON.stringify({
			event: "legal_readiness_seeded",
			references: result.references,
			requirements: result.requirements,
		}),
	);
} finally {
	await databasePool().end();
}
