/** Every word on the landing page. */
export const landing = {
  nav: [
    { href: "/#how", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/setup", label: "Setup guide" },
  ],
  hero: {
    eyebrow: "Databricks cost monitoring",
    title: "Know where your Databricks money goes.",
    body: "Cost Investigator tracks your Databricks spend every day, tells you what to look at next and warns you before the budget is gone.",
    primary: "Set up a cost review",
    secondary: "Explore the demo",
    note: "The demo uses made-up data. No sign-up needed.",
    supports: {
      label: "Supports",
      soon: "Soon",
      platforms: [
        { id: "databricks", name: "Databricks", soon: false },
        { id: "snowflake", name: "Snowflake", soon: true },
        { id: "fabric", name: "Microsoft Fabric", soon: true },
      ],
    },
    reportTitle: "Monthly cost review",
    reportOrg: "NORTHSTAR COMMERCE · NOV 2026",
    reportLines: [
      { label: "Usage matched to list prices", status: "pass" },
      { label: "Budget pace", status: "watch" },
      { label: "Daily spend spike on Nov 11", status: "watch" },
      { label: "Jobs traced to an owner", status: "pass" },
    ],
    totalLabel: "Estimated list cost",
    evidence: [
      { type: "usage", source: "system.billing.usage", summary: "4,382 usage records across 4 workspaces.", captured: "Nov 1–11" },
      { type: "list_price", source: "system.billing.list_prices", summary: "Every SKU matched to the price valid that day.", captured: "USD" },
      { type: "job_run", source: "system.lakeflow.job_run_timeline", summary: "12 failed runs found and priced.", captured: "238 runs" },
    ],
  },
  how: {
    title: "From raw billing rows to a clear answer, in three steps",
    steps: [
      { name: "Connect once", body: "Your engineer creates a read-only login. Cost Investigator reads Databricks’ own billing tables, never your business data." },
      { name: "See it every day", body: "Spend by product, job, person and endpoint, at list price, with the budget pace beside it." },
      { name: "Act and share", body: "Work through the recommendations, let alerts watch the thresholds, and send a report with one link." },
    ],
  },
  pillars: {
    title: "Three jobs it does for you",
    body: "The same billing data, put to work in three ways.",
    items: [
      { tag: "Track", href: "/app", name: "Where the money goes", body: "Daily list cost by product, workspace, job, serverless user and serving endpoint. Tags show who owns what." },
      { tag: "Recommend", href: "/recommendations", name: "What to look at next", body: "Findings such as overlapping runs, repeated retries and long auto-stop times, each with the rule and rows behind it." },
      { tag: "Automate", href: "/alerts", name: "A warning before the bill", body: "Alert rules for budget pace, daily spikes and serverless spend per workspace, user or job. Reports made in a click." },
    ],
  },
  beforeAfter: {
    title: "The monthly cost review, without the spreadsheet marathon",
    before: {
      label: "By hand",
      big: "Spreadsheets",
      unit: "rebuilt every month",
      points: ["Export usage and join it to prices yourself", "Chase who owns each job", "Find out about a spike when the invoice lands"],
    },
    after: {
      label: "With Cost Investigator",
      big: "One page",
      unit: "kept up to date for you",
      points: ["Usage already matched to list prices", "Every job, notebook and endpoint traced to an owner", "An alert the day spend jumps"],
    },
  },
  preview: {
    title: "A report finance can read and engineers can check",
    body: "Pick the sections, add a note and share it with a link. Every number names the table it came from.",
    cta: "Generate a sample report",
    docTitle: "Databricks Cost Review",
    sample: "Sample",
    totalLabel: "list cost · Nov 1–11, 2026",
  },
  trust: {
    title: "Careful with your workspace and honest about the numbers",
    points: [
      { title: "It can look, never touch", body: "A read-only login to system tables. No access to your business data, and it cannot start, stop or change anything." },
      { title: "List price, said plainly", body: "Costs are estimates at list price. Discounts, credits and taxes mean your invoice can differ, and we say so on every page." },
      { title: "No promised savings", body: "Recommendations are things to review, with the evidence shown. A saving only counts when later usage is lower." },
    ],
  },
  finalCta: {
    title: "Make your next cost review easier to explain.",
    body: "Walk through the setup in about two minutes, or go straight to the demo.",
  },
  footer: {
    tagline: "Databricks spend, explained.",
    demoNote: "Concept prototype. Sample figures for a fictional company. No live Databricks connection.",
    links: [
      { href: "/onboarding", label: "Get started" },
      { href: "/app", label: "Demo" },
      { href: "/styleguide", label: "Design system" },
    ],
  },
} as const;

/** Kept for existing imports. */
export const landingPlatforms = landing.hero.supports.platforms;
export const landingSteps = landing.how.steps;
