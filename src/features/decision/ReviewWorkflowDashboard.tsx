"use client";

import { useState } from "react";

type Role = "reviewer" | "steward";
type Evidence = {
	evidenceId: string;
	parkId: string;
	field: string;
	status: string;
	sourceUrl: string;
	verifiedOn: string;
	expiresOn: string | null;
};
type LegalRecord = {
	id: string;
	code: string;
	status: string;
	sector?: string;
};

export function ReviewWorkflowDashboard() {
	const [token, setToken] = useState("");
	const [role, setRole] = useState<Role | null>(null);
	const [evidence, setEvidence] = useState<Evidence[]>([]);
	const [legal, setLegal] = useState<{
		references: LegalRecord[];
		requirements: LegalRecord[];
	}>({ references: [], requirements: [] });
	const [status, setStatus] = useState("");
	const [problem, setProblem] = useState("");

	async function load() {
		setProblem("");
		const headers = { Authorization: `Bearer ${token}` };
		const [evidenceResponse, legalResponse] = await Promise.all([
			fetch("/api/internal/site-verification", { headers, cache: "no-store" }),
			fetch("/api/internal/legal-readiness", { headers, cache: "no-store" }),
		]);
		if (!evidenceResponse.ok || !legalResponse.ok) {
			setProblem(
				"Review service is unavailable or the operator is not authorized.",
			);
			return;
		}
		const evidencePayload = (await evidenceResponse.json()) as {
			data: Evidence[];
			role: Role;
		};
		const legalPayload = (await legalResponse.json()) as {
			data: { references: LegalRecord[]; requirements: LegalRecord[] };
		};
		setEvidence(evidencePayload.data);
		setLegal(legalPayload.data);
		setRole(evidencePayload.role);
		setStatus("Review records loaded.");
	}

	async function reviewEvidence(
		evidenceId: string,
		action: "approve" | "reject" | "revalidate",
	) {
		const note = window.prompt(
			"Review note (at least 10 characters)",
			"Source reviewed against the submitted evidence.",
		);
		if (!note) return;
		const response = await fetch("/api/internal/site-verification", {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ evidenceId, action, note }),
		});
		if (!response.ok) {
			setProblem("Evidence review could not be recorded.");
			return;
		}
		await load();
	}

	async function reviewLegal(
		entity: "reference" | "requirement",
		id: string,
		currentStatus: string,
	) {
		const note = window.prompt(
			"Review note (at least 10 characters)",
			"Reviewed against the official source.",
		);
		if (!note) return;
		const response = await fetch("/api/internal/legal-readiness", {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ entity, id, status: currentStatus, note }),
		});
		if (!response.ok) {
			setProblem("Legal review could not be recorded.");
			return;
		}
		await load();
	}

	return (
		<main className="internal-page" id="main-content" tabIndex={-1}>
			<header className="internal-page-header">
				<p className="eyebrow">Internal review</p>
				<h1>Evidence & legal review</h1>
				<p className="muted">
					Review records are advisory and do not certify site availability,
					investment eligibility, or legal compliance.
				</p>
			</header>
			<section className="session-bar">
				<label className="form-field" htmlFor="review-token">
					Operator token
					<input
						id="review-token"
						className="control-input"
						type="password"
						value={token}
						onChange={(event) => setToken(event.target.value)}
						autoComplete="off"
					/>
				</label>
				<button
					type="button"
					className="btn btn-primary"
					disabled={!token}
					onClick={() => void load()}
				>
					Open review queue
				</button>
				{role && (
					<span className="status-badge status-badge--info">{role}</span>
				)}
			</section>
			{status && (
				<p className="muted" role="status">
					{status}
				</p>
			)}
			{problem && (
				<p className="banner banner--error" role="alert">
					{problem}
				</p>
			)}
			{role && (
				<>
					<section
						className="review-queue"
						aria-labelledby="evidence-review-title"
					>
						<h2 id="evidence-review-title">Site verification evidence</h2>
						{evidence.length === 0 ? (
							<p className="muted">No evidence records.</p>
						) : (
							<ul>
								{evidence.map((item) => (
									<li key={item.evidenceId} className="review-card">
										<strong>
											{item.parkId} · {item.field}
										</strong>
										<span>
											{item.status} · verified {item.verifiedOn}
											{item.expiresOn ? ` · expires ${item.expiresOn}` : ""}
										</span>
										<a href={item.sourceUrl} target="_blank" rel="noreferrer">
											Source
										</a>
										{role === "reviewer" && (
											<div className="action-row">
												<button
													type="button"
													className="btn btn-sm"
													onClick={() =>
														void reviewEvidence(
															item.evidenceId,
															item.status === "verified" ||
																item.status === "expired"
																? "revalidate"
																: "approve",
														)
													}
												>
													{item.status === "verified" ||
													item.status === "expired"
														? "Revalidate"
														: "Approve"}
												</button>
												<button
													type="button"
													className="btn btn-secondary btn-sm"
													onClick={() =>
														void reviewEvidence(item.evidenceId, "reject")
													}
												>
													Reject
												</button>
											</div>
										)}
									</li>
								))}
							</ul>
						)}
					</section>
					<section
						className="review-queue"
						aria-labelledby="legal-review-title"
					>
						<h2 id="legal-review-title">Legal checklist records</h2>
						<ul>
							{[
								...legal.references.map((item) => ({
									...item,
									entity: "reference" as const,
								})),
								...legal.requirements.map((item) => ({
									...item,
									entity: "requirement" as const,
								})),
							].map((item) => (
								<li key={`${item.entity}-${item.id}`} className="review-card">
									<strong>{item.code}</strong>
									<span>
										{item.entity} · {item.status}
										{item.sector ? ` · ${item.sector}` : ""}
									</span>
									{role === "reviewer" && (
										<button
											type="button"
											className="btn btn-secondary btn-sm"
											onClick={() =>
												void reviewLegal(item.entity, item.id, item.status)
											}
										>
											Record review
										</button>
									)}
								</li>
							))}
						</ul>
					</section>
				</>
			)}
		</main>
	);
}
