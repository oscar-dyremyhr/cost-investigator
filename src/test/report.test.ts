import { describe, expect, it } from "vitest";
import { createCostReport, decodeReport, encodeReport, normalizeReport, reportFileName, reportToCsv, reportToSummary, shareUrl, type ReportContext } from "@/lib/cost-report";

const context: ReportContext = {
  statuses: { "untagged-usage": "dismissed", "warehouse-auto-stop": "planned" },
  alerts: [{ name: "Daily spend spike", detail: "Latest day is 37% above the 7-day average" }],
  budget: { amount: 150000, alertAt: 90, projection: 142200 },
};
const make = (sections = ["recommendations", "products", "budget"] as const) =>
  createCostReport({ title: "November review", organization: "Northstar Commerce", audience: "finance", sections: [...sections], note: "For the Thursday meeting." }, context, new Date("2026-11-12T09:30:00Z"));

describe("creating a report", () => {
  it("freezes the chosen sections in document order and only active recommendations", () => {
    const report = make();
    expect(report.sections).toEqual(["products", "budget", "recommendations"]);
    expect(report.recommendations.map((r) => r.id)).not.toContain("untagged-usage");
    expect(report.recommendations.find((r) => r.id === "warehouse-auto-stop")?.status).toBe("planned");
    expect(report.products.reduce((s, p) => s + p.estimatedListCostUsd, 0)).toBe(report.estimatedListCost);
  });
  it("covers the dates it is asked for", () => {
    const base = { title: "T", organization: "O", audience: "finance" as const, sections: ["products" as const], note: "" };
    const october = createCostReport({ ...base, range: { preset: "last-month" } }, context);
    expect(october.period).toBe("Oct 1–31, 2026");
    expect(october.comparison).toBe("the month before");
    expect(october.estimatedListCost).toBeGreaterThan(make().estimatedListCost);
    expect(october.products.reduce((s, p) => s + p.estimatedListCostUsd, 0)).toBeCloseTo(october.estimatedListCost, 1);
    const year = createCostReport({ ...base, range: { preset: "ytd" } }, context);
    expect(year.period).toBe("Sep 1 – Nov 11, 2026");
    expect([year.comparison, year.previousPeriodListCost]).toEqual(["", 0]);
    expect(reportToSummary(year)).toContain(`Estimated list cost: $${Math.round(year.estimatedListCost).toLocaleString("en-US")}.`);
    const custom = createCostReport({ ...base, range: { preset: "custom", from: "2026-09-10", to: "2026-09-16" } }, context);
    expect([custom.period, custom.comparison]).toEqual(["Sep 10–16, 2026", "the 7 days before"]);
  });
  it("falls back to sensible names", () => {
    const report = createCostReport({ title: " ", organization: "", audience: "everything", sections: [], note: "" }, context);
    expect([report.title, report.organization]).toEqual(["Databricks Cost Review", "Northstar Commerce"]);
  });
});

describe("share links", () => {
  it("carry the whole report and read back identically", async () => {
    const report = make();
    const payload = await encodeReport(report);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(payload.length).toBeLessThan(6000);
    expect(await decodeReport(payload)).toEqual(report);
    expect(await shareUrl(report, "https://example.test")).toBe(`https://example.test/share/${report.shareToken}#${payload}`);
  });
  it("reject anything that is not a report", async () => {
    expect(await decodeReport("")).toBeNull();
    expect(await decodeReport("not-a-report")).toBeNull();
    expect(normalizeReport({ id: "x" })).toBeNull();
    expect(normalizeReport(null)).toBeNull();
  });
  it("read reports saved by the first version of the app", () => {
    const old = { id: "cost-report-1", shareToken: "share-1", organization: "Acme", period: "Nov 1–11, 2026", currency: "USD", createdAt: "2026-11-11T10:00:00Z", estimatedListCost: 52140, previousPeriodListCost: 43800, dbus: 1, workspaces: 4, records: 9, products: [{ product: "JOBS", label: "Lakeflow Jobs", estimatedListCostUsd: 17500 }], jobs: [{ jobName: "A job", jobId: "1" }], recommendations: [{ id: "r", title: "T" }] };
    const report = normalizeReport(old)!;
    expect(report.sections).toEqual(["products", "jobs", "recommendations"]);
    expect(report.jobs[0].failedRuns).toBe(0);
    expect(report.title).toBe("Databricks Cost Review");
  });
});

describe("exports", () => {
  it("CSV has only the chosen sections and one header row", () => {
    const csv = reportToCsv(make());
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("section,item,detail,quantity,unit,estimated_list_cost_usd");
    expect(lines.some((l) => /^Billing product,Lakeflow Jobs,JOBS,\d+,DBU,17500$/.test(l))).toBe(true);
    expect(csv).toContain("Alert firing,Daily spend spike");
    expect(csv).not.toContain("Model serving endpoint");
    expect(csv).not.toContain("\r\nJob,");
  });
  it("CSV quotes commas and defuses formula cells", () => {
    const report = { ...make(), organization: '=HYPERLINK("http://x","y")' };
    expect(reportToCsv(report)).toContain(`Summary,"'=HYPERLINK(""http://x"",""y"")"`);
  });
  it("summary states the total, the change and what to review", () => {
    const text = reportToSummary(make());
    expect(text).toContain("Estimated list cost: $52,140 (+19.0% vs the same days last month).");
    expect(text).toContain("95% of the $150,000 budget");
    expect(make().period).toBe("Nov 1–11, 2026");
    expect(text).toContain("- Check for overlapping gold refresh runs ($420–$680 a month)");
    expect(text).toContain("Note: For the Thursday meeting.");
  });
  it("file names are safe", () => {
    expect(reportFileName(make(), "csv")).toBe("northstar-commerce-november-review-2026-11-12.csv");
  });
});
