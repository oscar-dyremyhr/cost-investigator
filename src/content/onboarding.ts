export const onboardingSteps = ["Account", "Connect", "Budget", "First review"];
export const onboardingWorkspaces = [
  { id: "984201764512", name: "Commerce production", region: "us-east-1" },
  { id: "229408156773", name: "Data science", region: "us-east-1" },
  { id: "729104832610", name: "Finance analytics", region: "us-west-2" },
];
export const onboardingGrantSql = `-- Run as an account or metastore admin. Replace the principal name if needed.\nGRANT USE CATALOG ON CATALOG system TO \`cost-investigator-reader\`;\nGRANT USE SCHEMA, SELECT ON SCHEMA system.billing TO \`cost-investigator-reader\`;\nGRANT USE SCHEMA, SELECT ON SCHEMA system.lakeflow TO \`cost-investigator-reader\`;\n\n-- Cost Investigator only reads usage, pricing, jobs and job run metadata.\n-- It does not need access to your business table rows.`;

export type OnboardingSetup = { organization: string; role: string; selected: string[] };
export const initialOnboardingSetup: OnboardingSetup = { organization: "", role: "FinOps / finance", selected: ["984201764512", "229408156773"] };

/** Every word in the onboarding wizard. */
export const onboarding = {
  title: "Let’s get your first cost review ready",
  subtitle: "Four short steps. About two minutes.",
  steps: ["Account", "Connect", "Budget", "First review"],
  account: {
    title: "Tell us who this is for",
    body: "The name goes on your reports. Pick the workspaces to include.",
    name: "Organization name",
    namePlaceholder: "Northstar Commerce",
    role: "Your role",
    roles: ["FinOps / finance", "Data platform", "Engineering", "Analytics", "Leadership", "Other"],
    workspaces: "Workspaces to include",
    workspacesHint: "Job costs are read one cloud region at a time, so pick every region you need.",
  },
  connect: {
    title: "Connect your Databricks account",
    body: "Cost Investigator gets its own read-only login, called a service principal. It reads the billing system tables through a SQL warehouse and never sees your business data.",
    urlLabel: "Workspace address",
    urlPlaceholder: "https://your-workspace.cloud.databricks.com",
    warehouseLabel: "SQL warehouse ID",
    warehousePlaceholder: "4b9c1f2e7a6d3c58",
    warehouseHint: "A small warehouse is enough.",
    demoHint: "In this demo, any details work and nothing is sent to Databricks. It never asks for a client secret.",
    demoUrl: "https://northstar-commerce.cloud.databricks.com",
    demoWarehouse: "4b9c1f2e7a6d3c58",
    useDemo: "Use the demo details",
    test: "Test connection",
    testing: "Testing connection…",
    checks: [
      "Reaching the SQL warehouse",
      "Reading usage from system.billing.usage",
      "Reading prices from system.billing.list_prices",
      "Reading job names and runs from system.lakeflow",
      "Confirming it cannot read or change your data",
    ],
    success: (workspaces: number) => `Connected. Usage found for ${workspaces} ${workspaces === 1 ? "workspace" : "workspaces"}, read-only.`,
    inviteTitle: "Don’t have these details?",
    inviteBody: "Your data platform engineer does. Send them the setup guide and the grants. It is a one-time job.",
    inviteOpen: "Open the setup guide",
    inviteCopy: "Copy the grants",
    inviteCopied: "Grants copied",
    inviteCopiedBody: "Send them to your engineer through your usual secure channel.",
  },
  budget: {
    title: "Set a monthly budget",
    body: "This is your own guardrail, not a Databricks limit. You can change it any time.",
    amount: "Monthly budget (US dollars, at list price)",
    alertAt: "Warn me when the month is on course to reach",
    thresholds: [75, 80, 90, 100],
    invalid: "Enter an amount above zero.",
  },
  review: {
    title: "Run your first review",
    body: "We’ll add up usage, match it to list prices and check your budget and alert rules. It takes a few seconds.",
    run: "Run first review",
    stages: ["Adding up usage", "Matching list prices", "Tracing jobs to owners", "Checking budget and alerts", "Looking for things to review"],
    done: "Your first review is ready",
    doneBody: (spend: string, projection: string) => `${spend} so far this month, on course for ${projection}.`,
    found: (recommendations: number, alerts: number) => `${recommendations} things to review and ${alerts} alerts firing.`,
    toRecommendations: "See what to review",
    toDashboard: "Open my overview",
  },
  footnote: "Your choices are saved in this browser. No Databricks credentials are collected in this demo.",
} as const;
