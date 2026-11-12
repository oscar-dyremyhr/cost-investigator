export type Billing = "monthly" | "annual";

/** Proposed introductory prices for partner feedback; checkout is not enabled. */
export const pricing = {
  currency: "EUR",
  annualFreeMonths: 2,
  plans: [
    {
      id: "starter",
      name: "Starter",
      monthly: 19,
      bestFor: "One team getting out of spreadsheets",
      workspaces: "1 workspace",
      seats: "3 team members",
      highlighted: false,
      features: ["Monthly cost review", "90 days of cost history", "Top workload drivers", "Shareable PDF summary"],
    },
    {
      id: "team",
      name: "Team",
      monthly: 49,
      bestFor: "Teams reviewing spend together",
      workspaces: "Up to 5 workspaces",
      seats: "10 team members",
      features: ["Weekly data refresh", "12 months of cost history", "Ranked savings opportunities", "Owners and follow-up tracking", "Scheduled report draft"],
      highlighted: true,
    },
    {
      id: "scale",
      name: "Scale",
      monthly: 129,
      bestFor: "Several teams or environments",
      workspaces: "Up to 15 workspaces",
      seats: "25 team members",
      highlighted: false,
      features: ["Everything in Team", "Consolidated workspace view", "Custom cost categories", "Quarterly review pack", "Priority support"],
    },
  ],
} as const;

export function displayedMonthlyPrice(monthly: number, billing: Billing) {
  if (billing === "monthly") return monthly;
  return Math.round((monthly * (12 - pricing.annualFreeMonths)) / 12);
}
