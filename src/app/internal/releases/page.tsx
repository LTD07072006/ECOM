import type { Metadata } from "next";
import { ReleaseDashboard } from "../../../features/releases/ReleaseDashboard";

export const metadata: Metadata = { title: "Release operations", robots: { index: false, follow: false } };

export default function ReleaseOperationsPage() {
  return <ReleaseDashboard />;
}
