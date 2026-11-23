import { databasePool } from "./pool";
import { seedDefaultInvestmentIncentives } from "../features/decision/investment-incentives-repository";
import { seedDefaultLegalReadiness } from "../features/decision/legal-readiness-repository";

try {
	const result = await seedDefaultLegalReadiness();
	const incentives = await seedDefaultInvestmentIncentives();
	console.info(
		JSON.stringify({
			event: "legal_readiness_seeded",
			references: result.references,
			requirements: result.requirements,
			incentives: incentives.incentives,
		}),
	);
} finally {
	await databasePool().end();
}
