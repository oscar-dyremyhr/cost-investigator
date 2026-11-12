import { otherServerlessJobsUsd, otherServerlessJobsWorkspaceId, serverlessNotebooks, topJobs } from "@/mocks/service";

export type Spend = { key: string; label: string; usd: number };

const add = (map: Map<string, number>, key: string, usd: number) => map.set(key, (map.get(key) ?? 0) + usd);
const sorted = (map: Map<string, number>, label = (k: string) => k): Spend[] =>
  [...map.entries()].map(([key, usd]) => ({ key, label: label(key), usd })).sort((a, b) => b.usd - a.usd);

export const serverlessJobs = () => topJobs.filter((j) => j.serverless);

/** Serverless list cost for jobs and notebooks, grouped the way the Databricks alert queries group it. */
export function serverlessSpend() {
  const jobs = serverlessJobs();
  const byWorkspace = new Map<string, number>();
  const byUser = new Map<string, number>();
  for (const j of jobs) {
    add(byWorkspace, j.workspaceId, j.estimatedListCostUsd);
    add(byUser, j.runAs, j.estimatedListCostUsd);
  }
  for (const n of serverlessNotebooks) {
    add(byWorkspace, n.workspaceId, n.estimatedListCostUsd);
    add(byUser, n.runAs, n.estimatedListCostUsd);
  }
  add(byWorkspace, otherServerlessJobsWorkspaceId, otherServerlessJobsUsd);
  add(byUser, "Other identities", otherServerlessJobsUsd);
  const jobsUsd = jobs.reduce((s, j) => s + j.estimatedListCostUsd, 0) + otherServerlessJobsUsd;
  const notebooksUsd = serverlessNotebooks.reduce((s, n) => s + n.estimatedListCostUsd, 0);
  return {
    jobsUsd,
    notebooksUsd,
    totalUsd: jobsUsd + notebooksUsd,
    byWorkspace: sorted(byWorkspace, (k) => `Workspace ${k}`),
    byUser: sorted(byUser),
    byJob: jobs.map((j) => ({ key: j.jobId, label: j.jobName, usd: j.estimatedListCostUsd })).sort((a, b) => b.usd - a.usd),
  };
}
