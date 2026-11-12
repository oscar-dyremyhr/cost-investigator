import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card border border-line bg-surface p-6 shadow-card print-plain", className)} {...props} />;
}

const badgeTones = {
  neutral: "bg-paper-deep text-ink border-line",
  brand: "bg-brand-soft text-ink border-brand/30",
  mint: "bg-mint text-on-accent border-transparent",
  sun: "bg-sun text-on-accent border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-fix-ink">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const control =
  "h-11 w-full rounded-input border border-line-strong bg-surface px-3.5 text-sm text-ink placeholder:text-ink-muted/70 " +
  "transition-shadow focus-visible:border-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/30 " +
  "aria-invalid:border-fix-ink";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "pr-8", className)} {...props} />;
}

/** A big tappable option used in wizards (checkbox or radio underneath). */
export function ChoiceCard({
  type,
  name,
  checked,
  onChange,
  title,
  description,
  icon,
  value,
}: {
  type: "checkbox" | "radio";
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  value?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border bg-surface p-4 transition-[border-color,box-shadow,transform] duration-200 ease-spring hover:-translate-y-0.5",
        "has-focus-visible:ring-3 has-focus-visible:ring-brand/40",
        checked ? "border-brand ring-1 ring-brand" : "border-line-strong",
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 accent-(--brand)"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold">
          {icon}
          {title}
        </span>
        {description ? <span className="mt-0.5 block text-sm text-ink-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-paper-deep p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-line/70", className)} />;
}

export function PageLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-40 w-full rounded-card" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>
    </div>
  );
}
