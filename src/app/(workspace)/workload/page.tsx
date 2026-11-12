import { Suspense } from "react";
import Screen from "@/screens/app/Workload";

// Reads ?kind= and ?id= from the address, so it renders in the browser.
export default function Page() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-6xl px-5 py-12 text-sm text-ink-muted">Opening…</main>}>
      <Screen />
    </Suspense>
  );
}
