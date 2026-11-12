"use client";

import { Accordion as A } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { GlossaryText } from "./Term";

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <A.Root type="multiple" className="divide-y divide-line rounded-card border border-line bg-surface">
      {items.map((item, i) => (
        <A.Item key={item.q} value={`item-${i}`}>
          <A.Header>
            <A.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold hover:bg-ink/4">
              {item.q}
              <ChevronDown
                className="size-5 shrink-0 text-ink-muted transition-transform duration-300 ease-spring group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <p className="max-w-prose px-5 pb-5 text-ink-muted">
              <GlossaryText text={item.a} />
            </p>
          </A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
