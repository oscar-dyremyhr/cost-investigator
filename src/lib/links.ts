/** The kinds of thing that have a detail page. */
export type WorkloadKind = "job" | "warehouse" | "cluster" | "pipeline" | "endpoint" | "notebook" | "workspace";
export const workloadKinds: WorkloadKind[] = ["job", "warehouse", "cluster", "pipeline", "endpoint", "notebook", "workspace"];
export const kindLabels: Record<WorkloadKind, string> = { job: "Job", warehouse: "SQL warehouse", cluster: "Cluster", pipeline: "Pipeline", endpoint: "Serving endpoint", notebook: "Notebook", workspace: "Workspace" };

export const workloadHref = (kind: WorkloadKind, id: string) => `/workload?kind=${kind}&id=${encodeURIComponent(id)}`;
