import type { Metadata } from "next";
import { ReviewWorkflowDashboard } from "../../../features/decision/ReviewWorkflowDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Evidence and legal review",
	robots: { index: false, follow: false },
};

export default function ReviewWorkflowPage() {
	return <ReviewWorkflowDashboard />;
}
