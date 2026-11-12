export const costReportCopy = {
  title: "Databricks Cost Review",
  subtitle: "A clear, shareable summary of usage, estimated list cost and follow-up opportunities.",
  sampleNotice: "Illustrative sample data. Cost figures are estimated from list prices and are not invoice totals.",
  shareScope: "The whole report travels inside the link itself. Nothing is uploaded, and anyone who has the link can read the report.",
  estimateNote: "List-price estimates use metered usage and effective list prices. Contract discounts, credits, entitlements, taxes and other adjustments can make invoiced spend differ.",
  attributionNote: "Job cost attribution covers job compute and serverless workloads only. SQL warehouse and all-purpose compute usage remains in the billing totals but is not included in this job ranking.",
};

/** The parts a report can include. The cover, summary and method are always there. */
export const reportSections = [
  { id: "products", title: "Spend by billing product", description: "List cost and usage for each Databricks product." },
  { id: "jobs", title: "Highest-cost jobs", description: "The jobs behind the spend, with failed-run cost." },
  { id: "serverless", title: "Serverless by user", description: "Who ran serverless jobs and notebooks." },
  { id: "serving", title: "Model serving endpoints", description: "DBUs and list cost per endpoint." },
  { id: "budget", title: "Budget and alerts", description: "Month-end projection and the alerts firing now." },
  { id: "recommendations", title: "Recommendations", description: "Open findings with a signal and a next step." },
] as const;
export type ReportSectionId = (typeof reportSections)[number]["id"];

/** Who the report is for decides which sections start ticked. */
export const reportAudiences = [
  { id: "finance", title: "Finance", description: "Totals, budget pace and what to follow up.", sections: ["products", "budget", "recommendations"] },
  { id: "engineering", title: "Engineering", description: "Jobs, serverless and endpoints in detail.", sections: ["products", "jobs", "serverless", "serving", "recommendations"] },
  { id: "everything", title: "Everything", description: "Every section, for a full monthly review.", sections: ["products", "jobs", "serverless", "serving", "budget", "recommendations"] },
] as const satisfies readonly { id: string; title: string; description: string; sections: readonly ReportSectionId[] }[];
export type ReportAudienceId = (typeof reportAudiences)[number]["id"];
