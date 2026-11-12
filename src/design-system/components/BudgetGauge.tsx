"use client";

import { motion, useReducedMotion } from "motion/react";
import { copy, type Status } from "@/content/copy";
import { cn } from "@/lib/utils";

const bandColor = { pass: "var(--status-pass)", watch: "var(--status-watch)", fix: "var(--status-fix)" };
const bandInk = { pass: "text-pass-ink", watch: "text-watch-ink", fix: "text-fix-ink" };

/** Below the alert threshold is on pace, at or above it is close, above 100% is over. */
export function budgetBand(percent: number, alertAt = 90): Status {
  if (percent > 100) return "fix";
  return percent >= alertAt ? "watch" : "pass";
}

/** Big friendly budget gauge. A percentage is never shown without a word beside it. */
export function BudgetGauge({
  percent,
  alertAt = 90,
  size = 220,
  className,
  animate = true,
}: {
  /** Spend (or projected spend) as a percentage of the budget. Can exceed 100. */
  percent: number;
  /** The alert threshold, as a percentage of the budget. */
  alertAt?: number;
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const reduce = useReducedMotion();
  const shown = Math.round(percent);
  const band = budgetBand(percent, alertAt);
  const r = 80;
  const sweep = 240; // degrees of arc
  const circumference = 2 * Math.PI * r;
  const arc = (sweep / 360) * circumference;
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * arc;
  const still = reduce || !animate;

  return (
    <div
      className={cn("relative inline-flex flex-col items-center", className)}
      style={{ width: size }}
      role="img"
      aria-label={copy.gauge.aria(shown, copy.gauge.words[band])}
    >
      <svg viewBox="0 0 200 170" className="w-full" aria-hidden>
        <g transform="rotate(150 100 100)">
          <circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="var(--line)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
          <motion.circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke={bandColor[band]}
            strokeWidth="16"
            strokeLinecap="round"
            initial={still ? false : { strokeDasharray: `0.01 ${circumference}` }}
            animate={{ strokeDasharray: `${Math.max(filled, 0.01)} ${circumference}` }}
            transition={still ? { duration: 0 } : { type: "spring", stiffness: 40, damping: 12, delay: 0.15 }}
          />
        </g>
      </svg>
      <div className="absolute inset-x-0 top-[34%] flex flex-col items-center">
        <span className="tabular font-mono text-5xl leading-none font-bold" data-testid="budget-value">
          {shown}
          <span className="text-2xl">%</span>
        </span>
        <span className="mt-1 font-mono text-xs text-ink-muted">{copy.gauge.ofBudget}</span>
      </div>
      <span className={cn("-mt-4 text-sm font-semibold", bandInk[band])}>{copy.gauge.words[band]}</span>
    </div>
  );
}
