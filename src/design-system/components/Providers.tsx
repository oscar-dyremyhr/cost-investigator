"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Tooltip } from "radix-ui";
import { Toaster } from "./Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <Tooltip.Provider delayDuration={150}>
        {children}
        <Toaster />
      </Tooltip.Provider>
    </MotionConfig>
  );
}
