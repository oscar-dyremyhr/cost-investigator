import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlanCard({
  name,
  price,
  pricePrefix,
  period,
  note,
  bestFor,
  features,
  action,
  highlighted,
  badge,
  className,
}: {
  name: string;
  price: string;
  pricePrefix?: string;
  period?: string;
  note?: string;
  bestFor: string;
  features: string[];
  action: ReactNode;
  highlighted?: boolean;
  badge?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-card border bg-surface p-6",
        highlighted ? "border-brand shadow-pop ring-2 ring-brand" : "border-line shadow-card",
        className,
      )}
      data-plan={name}
    >
      {badge ? (
        <span className="absolute -top-3 left-6 rounded-full bg-sun px-3 py-0.5 text-xs font-bold text-on-accent">
          {badge}
        </span>
      ) : null}
      <h3 className="text-lg font-bold">{name}</h3>
      <p className="mt-1 min-h-10 text-sm text-ink-muted">{bestFor}</p>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
        {pricePrefix ? <span className="text-sm text-ink-muted">{pricePrefix}</span> : null}
        <span className="tabular font-mono text-3xl font-bold" data-testid="plan-price">
          {price}
        </span>
        {period ? <span className="text-sm text-ink-muted">{period}</span> : null}
      </p>
      <p className="mt-1 min-h-5 text-xs font-medium text-pass-ink">{note}</p>
      <ul className="mt-4 mb-6 flex-1 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-pass-ink" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {action}
    </div>
  );
}
