"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { copy } from "@/content/copy";

type Tone = "success" | "info" | "warning";
type ToastItem = { id: number; title: string; description?: string; tone: Tone };

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(input: { title: string; description?: string; tone?: Tone }) {
  const id = nextId++;
  items = [...items, { id, tone: "success", ...input }];
  emit();
  setTimeout(() => dismiss(id), 4500);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const empty: ToastItem[] = [];

const icons = { success: CircleCheck, info: Info, warning: TriangleAlert };
const iconColor = { success: "text-pass-ink", info: "text-brand", warning: "text-watch-ink" };

export function Toaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => empty,
  );
  return (
    <div
      className="no-print pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      role="region"
      aria-live="polite"
      aria-label={copy.common.notifications}
    >
      <AnimatePresence>
        {list.map((t) => {
          const Icon = icons[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-pop"
              data-testid="toast"
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${iconColor[t.tone]}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description ? <p className="mt-0.5 text-sm text-ink-muted">{t.description}</p> : null}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label={copy.common.dismiss}
                className="rounded-full p-1 text-ink-muted hover:bg-ink/8 hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
