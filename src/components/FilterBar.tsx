"use client";

import { useMemo } from "react";
import type { Entry, Status } from "@/lib/types";

export type FilterState = {
  month: string; // "all" | "YYYY-MM"
  statusIds: string[]; // empty = all
  from: string; // "" | "YYYY-MM-DD"
  to: string;
};

export const emptyFilters: FilterState = {
  month: "all",
  statusIds: [],
  from: "",
  to: "",
};

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map((n) => parseInt(n, 10));
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

type Props = {
  entries: Entry[];
  statuses: Status[];
  value: FilterState;
  onChange: (next: FilterState) => void;
};

export default function FilterBar({
  entries,
  statuses,
  value,
  onChange,
}: Props) {
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.occurred_at) set.add(e.occurred_at.slice(0, 7));
      else set.add(e.created_at.slice(0, 7));
    }
    return Array.from(set).sort().reverse();
  }, [entries]);

  function toggleStatus(id: string) {
    const has = value.statusIds.includes(id);
    onChange({
      ...value,
      statusIds: has
        ? value.statusIds.filter((x) => x !== id)
        : [...value.statusIds, id],
    });
  }

  const filterActive =
    value.month !== "all" ||
    value.statusIds.length > 0 ||
    value.from !== "" ||
    value.to !== "";

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-dim text-sm">Month</span>
          <select
            value={value.month}
            onChange={(e) => onChange({ ...value, month: e.target.value })}
            className="glass-input py-1 text-sm"
          >
            <option value="all">All months</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-dim text-sm">From</span>
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="glass-input py-1 text-sm w-[10.5rem]"
          />
          <span className="text-dim text-sm">To</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="glass-input py-1 text-sm w-[10.5rem]"
          />
        </div>

        {filterActive && (
          <button
            onClick={() => onChange(emptyFilters)}
            className="btn-ghost text-sm ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dim text-sm mr-1">Status</span>
        {statuses.map((s) => {
          const active = value.statusIds.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggleStatus(s.id)}
              className="chip transition"
              style={{
                background: active ? `${s.color}33` : undefined,
                borderColor: active ? `${s.color}aa` : undefined,
                opacity: value.statusIds.length === 0 || active ? 1 : 0.45,
              }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ background: s.color }}
              />
              {s.label}
            </button>
          );
        })}
        {value.statusIds.length > 0 && (
          <button
            onClick={() => onChange({ ...value, statusIds: [] })}
            className="text-xs text-dim hover:underline ml-1"
          >
            reset
          </button>
        )}
      </div>
    </div>
  );
}

export function applyFilters(entries: Entry[], f: FilterState): Entry[] {
  return entries.filter((e) => {
    const date = e.occurred_at ?? e.created_at.slice(0, 10);
    if (f.month !== "all" && (date ?? "").slice(0, 7) !== f.month) return false;
    if (f.from && date < f.from) return false;
    if (f.to && date > f.to) return false;
    if (f.statusIds.length > 0 && !f.statusIds.includes(e.status_id ?? ""))
      return false;
    return true;
  });
}
