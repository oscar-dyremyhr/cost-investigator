"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const colors = ["var(--brand)", "var(--mint)", "var(--sun)", "var(--status-fix)", "var(--ink)"];

type Piece = { id: number; x: number; y: number; r: number; color: string; delay: number; w: number; h: number };

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: (Math.random() - 0.5) * 640,
    y: -(120 + Math.random() * 320),
    r: (Math.random() - 0.5) * 720,
    color: colors[id % colors.length],
    delay: Math.random() * 0.15,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 10,
  }));
}

/** One short burst. Only for the first report and for purchases. Skipped for reduced motion. */
export function Confetti({ count = 70 }: { count?: number }) {
  const reduce = useReducedMotion();
  const [pieces] = useState(() => makePieces(count));
  if (reduce) return null;
  return (
    <div aria-hidden data-testid="confetti" className="no-print pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <div className="absolute top-1/2 left-1/2">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute block rounded-[2px]"
            style={{ width: p.w, height: p.h, background: p.color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: p.x, y: [0, p.y, p.y + 700], opacity: [1, 1, 0], rotate: p.r }}
            transition={{ duration: 2.2, delay: p.delay, ease: [0.2, 0.8, 0.4, 1], times: [0, 0.35, 1] }}
          />
        ))}
      </div>
    </div>
  );
}
