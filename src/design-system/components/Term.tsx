"use client";

import { Fragment, type ReactNode } from "react";
import { Tooltip } from "radix-ui";
import { glossary, glossaryPattern, type GlossaryKey, lookupTerm } from "@/content/glossary";

/** A technical word with a dotted underline and a one-sentence explanation on hover or focus. */
export function Term({ k, children }: { k: GlossaryKey; children?: ReactNode }) {
  const entry = glossary[k];
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          tabIndex={0}
          data-term={k}
          className="cursor-help rounded-sm underline decoration-ink-muted decoration-dotted decoration-1 underline-offset-4"
        >
          {children ?? entry.term}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="no-print z-[70] max-w-xs rounded-xl bg-ink px-3.5 py-2.5 text-sm leading-snug text-paper shadow-pop data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95"
        >
          <span className="font-semibold">{entry.term}: </span>
          {entry.definition}
          <Tooltip.Arrow className="fill-ink" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Wraps every glossary word found in a plain string with a Term tooltip. */
export function GlossaryText({ text }: { text: string }) {
  const parts = text.split(glossaryPattern);
  return (
    <>
      {parts.map((part, i) => {
        const key = lookupTerm(part);
        return key ? (
          <Term key={i} k={key}>
            {part}
          </Term>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      })}
    </>
  );
}
