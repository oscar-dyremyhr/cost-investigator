import { Suspense } from "react";
import Screen from "@/screens/report/CostReportView";
export default function Page() { return <Suspense fallback={<main className="mx-auto min-h-screen max-w-5xl px-5 py-12 text-sm text-ink-muted">Opening report…</main>}><Screen/></Suspense>; }
export const instant = false;
