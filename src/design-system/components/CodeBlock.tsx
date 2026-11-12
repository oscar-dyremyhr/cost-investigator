"use client";

import { Copy } from "lucide-react";
import { toast } from "./Toast";
import { cn } from "@/lib/utils";

/** A query or API call in the mono "till" font, with a copy button. Scrolls sideways inside its own box. */
export function CodeBlock({
  code,
  label,
  copyLabel,
  copiedMessage,
  className,
}: {
  code: string;
  label: string;
  copyLabel: string;
  copiedMessage: string;
  className?: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard blocked: the text can still be selected by hand */
    }
    toast({ title: copiedMessage });
  };
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-line bg-paper-deep", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
        <span className="font-mono text-xs font-semibold break-all text-ink-muted">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-ink hover:bg-ink/8"
        >
          <Copy className="size-3.5" aria-hidden />
          {copyLabel}
        </button>
      </div>
      <pre tabIndex={0} className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}
