"use client";

import { motion, useReducedMotion } from "motion/react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

/** Rubber-stamp mark for list-price estimates and reviewed findings. Thumps in once, then stays put. */
export function Stamp({
  label = copy.stamp.listPrice,
  size = "md",
  delay = 0,
  className,
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-label={label}
      initial={reduce ? false : { scale: 2.4, opacity: 0, rotate: -24 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 16, delay }}
      className={cn(
        "inline-block rounded-md border-[3px] border-double border-pass-ink font-mono font-bold tracking-[0.18em] text-pass-ink uppercase",
        size === "sm" && "px-1.5 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-4 py-1.5 text-lg",
        className,
      )}
    >
      {label}
    </motion.span>
  );
}
