import { Database, Gauge, Layers3, Server, Tags, Timer } from "lucide-react";
import { copy, type EvidenceType } from "@/content/copy";
import { cn } from "@/lib/utils";

export const evidenceIcons: Record<EvidenceType, typeof Database> = {
  usage: Database,
  list_price: Layers3,
  job_run: Timer,
  compute: Server,
  tag: Tags,
  budget: Gauge,
};

export type Evidence = {
  type: EvidenceType;
  /** The system table or setting the figure came from. */
  source: string;
  summary: string;
  details?: string;
  /** A short, already formatted note such as the period or capture date. */
  captured?: string;
};

/** The source behind a figure, on receipt paper with a zigzag bottom edge. */
export function EvidenceCard({
  evidence,
  compact,
  className,
}: {
  evidence: Evidence;
  compact?: boolean;
  className?: string;
}) {
  const Icon = evidenceIcons[evidence.type];
  return (
    <div className={cn("paper-shadow print-plain", className)}>
      <div className="zigzag-bottom bg-surface px-4 pt-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
          <Icon className="size-3.5 text-brand" aria-hidden />
          {copy.evidenceTypes[evidence.type]}
        </div>
        <p className={cn("mt-1.5 text-ink", compact ? "text-xs" : "text-sm")}>{evidence.summary}</p>
        {!compact && evidence.details ? <p className="mt-1 text-xs text-ink-muted">{evidence.details}</p> : null}
        <div className="dashed-rule mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 pt-2 font-mono text-[11px] text-ink-muted">
          <span className="break-all">{evidence.source}</span>
          {evidence.captured ? <span className="tabular">{evidence.captured}</span> : null}
        </div>
      </div>
    </div>
  );
}
