export const onboardingSteps = ["Account", "Connect", "Check", "First review"];
export const onboardingWorkspaces = [
  { id: "984201764512", name: "Commerce production", region: "us-east-1" },
  { id: "229408156773", name: "Data science", region: "us-east-1" },
  { id: "729104832610", name: "Finance analytics", region: "us-west-2" },
];
export const onboardingGrantSql = `-- Run as an account or metastore admin. Replace the principal name if needed.\nGRANT USE CATALOG ON CATALOG system TO \`cost-investigator-reader\`;\nGRANT USE SCHEMA, SELECT ON SCHEMA system.billing TO \`cost-investigator-reader\`;\nGRANT USE SCHEMA, SELECT ON SCHEMA system.lakeflow TO \`cost-investigator-reader\`;\n\n-- Cost Investigator only reads usage, pricing, jobs and job run metadata.\n-- It does not need access to your business table rows.`;

export type OnboardingSetup = { organization: string; role: string; currency: string; selected: string[]; period: string };
export const initialOnboardingSetup: OnboardingSetup = { organization: "", role: "FinOps / finance", currency: "USD", selected: ["984201764512", "229408156773"], period: "30 days" };
