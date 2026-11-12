"use client";

import { useRef, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

/**
 * These dialogs are opened from code, not from a Radix trigger, so we remember
 * what had focus and hand it back on close. Keyboard users land where they were.
 */
function useReturnFocus() {
  const previous = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      if (previous.current?.isConnected) {
        event.preventDefault();
        previous.current.focus();
      }
    },
  };
}

const overlay =
  "no-print fixed inset-0 z-50 bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  hideClose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: "md" | "lg";
  hideClose?: boolean;
}) {
  const returnFocus = useReturnFocus();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          {...returnFocus}
          className={cn(
            "no-print fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card bg-surface p-6 shadow-pop sm:p-8",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            size === "md" ? "max-w-lg" : "max-w-3xl",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-heading text-2xl font-bold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1.5 text-ink-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            {hideClose ? null : (
              <Dialog.Close
                aria-label={copy.common.close}
                className="-mt-1 -mr-2 rounded-full p-2 text-ink-muted hover:bg-ink/8 hover:text-ink"
              >
                <X className="size-5" aria-hidden />
              </Dialog.Close>
            )}
          </div>
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Side panel that slides in from the right. Used for control details. */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const returnFocus = useReturnFocus();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          {...returnFocus}
          className={cn(
            "no-print fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-paper shadow-pop",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200 data-[state=open]:duration-300",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-6 py-5">
            <div className="min-w-0">
              <Dialog.Title className="font-heading text-xl leading-snug font-bold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-xs text-ink-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label={copy.common.close}
              className="-mt-1 -mr-2 rounded-full p-2 text-ink-muted hover:bg-ink/8 hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer ? <div className="border-t border-line bg-surface px-6 py-4">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
