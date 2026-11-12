import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

/**
 * Change against the previous period. For cost, up is the direction to watch
 * and down is the good one. Always an arrow and a number, never colour alone.
 */
export function DeltaPill({ percent, className }: { percent: number; className?: string }) {
  const value = `${Math.abs(percent).toFixed(1)}%`;
  const Icon = percent > 0 ? ArrowUpRight : percent < 0 ? ArrowDownRight : Minus;
  const label = percent > 0 ? copy.delta.up(value) : percent < 0 ? copy.delta.down(value) : copy.delta.flat;
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        percent > 0 && "border-watch-ink/40 bg-watch-soft text-watch-ink",
        percent < 0 && "border-pass-ink/40 bg-pass-soft text-pass-ink",
        percent === 0 && "border-line bg-paper-deep text-ink-muted",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="tabular font-mono">{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** One headline number with its label, context and a footnote on how to read it. */
export function StatTile({
  label,
  value,
  sub,
  foot,
  icon,
  delta,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  foot?: string;
  icon?: ReactNode;
  /** Percentage change against the previous period. */
  delta?: number;
  className?: string;
}) {
  return (
    <article className={cn("rounded-card border border-line bg-surface p-5 shadow-card print-plain", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-muted">{label}</span>
        {icon ? <span className="text-ink-muted [&_svg]:size-[18px]">{icon}</span> : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="tabular font-mono text-2xl font-bold">{value}</p>
        {delta === undefined ? null : <DeltaPill percent={delta} />}
      </div>
      {sub ? <p className="mt-1 text-xs text-ink-muted">{sub}</p> : null}
      {foot ? <p className="mt-3 border-t border-line pt-2 text-[11px] text-ink-muted">{foot}</p> : null}
    </article>
  );
}
