import { Check } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

/** Wizard progress: numbered steps plus a progress bar. */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  const pct = Math.round(((current + 1) / steps.length) * 100);
  return (
    <nav aria-label={copy.stepper.aria} className={className}>
      <div
        className="h-2 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={copy.stepper.progress(current + 1, steps.length)}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-spring"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="mt-3 flex gap-2">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 text-sm",
                active ? "font-semibold text-ink" : "text-ink-muted",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                  done && "bg-mint text-on-accent",
                  active && "bg-brand text-brand-ink",
                  !done && !active && "border border-line-strong",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className="truncate max-sm:sr-only">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
