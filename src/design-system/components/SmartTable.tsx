"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { DataTable, type Column } from "./DataTable";

export type SmartColumn<T> = Column<T> & {
  /** Makes the column sortable. Return the value to sort by. */
  sort?: (row: T) => number | string;
  /** The column's name for screen readers when `header` is not plain text. */
  label?: string;
};

/**
 * A table for lists that can be long: click a heading to sort, type to filter,
 * and page through the rest. The search box and pager only appear when the
 * list is long enough to need them, so short tables look like a plain table.
 */
export function SmartTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  className,
  search,
  searchLabel = "Filter",
  pageSize = 15,
}: {
  columns: SmartColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  empty?: ReactNode;
  className?: string;
  /** The text a row is matched against. Leave out for a table without a search box. */
  search?: (row: T) => string;
  searchLabel?: string;
  pageSize?: number;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [descending, setDescending] = useState(true);
  const [page, setPage] = useState(0);

  const needle = query.trim().toLowerCase();
  const filtered = useMemo(() => (needle && search ? rows.filter((r) => search(r).toLowerCase().includes(needle)) : rows), [rows, needle, search]);
  const sorted = useMemo(() => {
    const by = columns.find((c) => c.key === sortKey)?.sort;
    if (!by) return filtered;
    return [...filtered].sort((a, b) => {
      const x = by(a);
      const y = by(b);
      const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en", { numeric: true });
      return descending ? -order : order;
    });
  }, [filtered, columns, sortKey, descending]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * pageSize, (current + 1) * pageSize);
  const showSearch = Boolean(search) && rows.length > 8;

  const toggle = (c: SmartColumn<T>) => {
    setPage(0);
    if (sortKey === c.key) setDescending((d) => !d);
    else {
      setSortKey(c.key);
      // Numbers start largest first, names start A to Z.
      setDescending(rows.length > 0 && typeof c.sort!(rows[0]) === "number");
    }
  };

  const withSort: Column<T>[] = columns.map((c) => {
    if (!c.sort) return c;
    const active = sortKey === c.key;
    const Icon = !active ? ChevronsUpDown : descending ? ArrowDown : ArrowUp;
    const name = c.label ?? (typeof c.header === "string" ? c.header : c.key);
    return {
      ...c,
      header: (
        <button type="button" onClick={() => toggle(c)} aria-label={`Sort by ${name}${active ? (descending ? ", now largest first" : ", now smallest first") : ""}`} className={cn("inline-flex items-center gap-1 rounded-md uppercase hover:text-ink", c.align === "right" && "flex-row-reverse", active && "text-ink")}>
          {c.header}
          <Icon className={cn("size-3.5 shrink-0", !active && "opacity-50")} aria-hidden />
        </button>
      ),
    };
  });

  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className={className}>
      {showSearch ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <label className="relative block w-full max-w-xs">
            <span className="sr-only">{searchLabel}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              type="search"
              value={query}
              placeholder={searchLabel}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              className="h-10 w-full rounded-input border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-ink-muted/70 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none"
            />
          </label>
          <p className="text-xs text-ink-muted" aria-live="polite">
            {needle ? `${sorted.length} of ${rows.length}` : `${rows.length} in total`}
          </p>
        </div>
      ) : null}
      {sorted.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">Nothing matches “{query}”.</p>
      ) : (
        <DataTable columns={withSort} rows={visible} rowKey={rowKey} caption={caption} />
      )}
      {pages > 1 ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-ink-muted">
          <span>
            {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} of {sorted.length}
          </span>
          <span className="flex items-center gap-1">
            <Button variant="ghost" size="sm" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}>
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="tabular font-mono">
              {current + 1} / {pages}
            </span>
            <Button variant="ghost" size="sm" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </span>
        </div>
      ) : null}
    </div>
  );
}
