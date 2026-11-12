import type { Usage } from "@/mocks/service";

export type Spend = { key: string; label: string; usd: number };

const add = (map: Map<string, number>, key: string, usd: number) => map.set(key, (map.get(key) ?? 0) + usd);
const sorted = (map: Map<string, number>, label = (k: string) => k): Spend[] =>
  [...map.entries()].map(([key, usd]) => ({ key, label: label(key), usd: Math.round(usd * 100) / 100 })).sort((a, b) => b.usd - a.usd);

export const serverlessJobs = (usage: Usage) => usage.jobs.filter((j) => j.serverless);

/** Serverless list cost for jobs and notebooks, grouped the way the Databricks alert queries group it. */
export function serverlessSpend(usage: Usage) {
  const jobs = serverlessJobs(usage);
  const byWorkspace = new Map<string, number>();
  const byUser = new Map<string, number>();
  for (const j of jobs) {
    add(byWorkspace, j.workspaceId, j.estimatedListCostUsd);
    add(byUser, j.runAs, j.estimatedListCostUsd);
  }
  for (const n of usage.notebooks) {
    add(byWorkspace, n.workspaceId, n.estimatedListCostUsd);
    add(byUser, n.runAs, n.estimatedListCostUsd);
  }
  const jobsUsd = jobs.reduce((s, j) => s + j.estimatedListCostUsd, 0);
  const notebooksUsd = usage.notebooks.reduce((s, n) => s + n.estimatedListCostUsd, 0);
  return {
    jobsUsd: Math.round(jobsUsd * 100) / 100,
    notebooksUsd: Math.round(notebooksUsd * 100) / 100,
    totalUsd: Math.round((jobsUsd + notebooksUsd) * 100) / 100,
    byWorkspace: sorted(byWorkspace, (k) => `Workspace ${k}`),
    byUser: sorted(byUser),
    byJob: jobs.map((j) => ({ key: j.jobId, label: j.jobName, usd: j.estimatedListCostUsd })).sort((a, b) => b.usd - a.usd),
  };
}
