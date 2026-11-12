import Link from "next/link";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

/** A coin under a magnifying glass, on the brand square. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <circle cx="14.5" cy="14.5" r="7" fill="none" stroke="var(--brand-ink)" strokeWidth="2.4" />
      <path d="M19.8 19.8 l5 5" stroke="var(--brand-ink)" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M14.5 10.8 v7.4 M16.6 12.6 h-3 a1.3 1.3 0 0 0 0 2.6 h1.8 a1.3 1.3 0 0 1 0 2.6 h-3.2" fill="none" stroke="var(--brand-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 rounded-lg", className)} aria-label={copy.brand.name}>
      <LogoMark />
      <span className="font-heading text-xl font-extrabold tracking-tight">{copy.brand.name}</span>
    </Link>
  );
}
