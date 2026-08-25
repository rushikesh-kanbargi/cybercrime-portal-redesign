import type { Metadata } from "next";
import { MoneyReportWizard } from "./money-report-wizard";

export const metadata: Metadata = {
  title: "Money was taken from my account — Cybercrime Report & Track",
  description: "Report financial fraud in under 90 seconds. No login required.",
};

// §25.2 — the flagship flow. No login, no minimum narrative length, never
// blocks on AI (the classifier and extractor are both deterministic, §15.1).
export default function ReportMoneyPage() {
  return <MoneyReportWizard />;
}
