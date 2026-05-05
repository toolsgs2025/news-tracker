"use client";

import { useMemo } from "react";
import type { Entry, Status } from "@/lib/types";

export type FilterState = {
  query: string;
  month: string; // "all" | "YYYY-MM"
  statusIds: string[]; // empty = all
  from: string; // "" | "YYYY-MM-DD"
  to: string;
};

export const emptyFilters: FilterState = {
  query: "",
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
    value.query !== "" ||
    value.month !== "all" ||
    value.statusIds.length > 0 ||
    value.from !== "" ||
    value.to !== "";

  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="block text-dim text-xs mb-1">Search</label>
        <input
          type="search"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          placeholder="topic, keywords, url…"
          className="input py-1.5 text-sm w-full"
        />
      </div>

      <div>
        <label className="block text-dim text-xs mb-1">Month</label>
        <select
          value={value.month}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
          className="input py-1.5 text-sm w-full"
        >
          <option value="all">All months</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-dim text-xs mb-1">From</label>
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="input py-1.5 text-sm w-full"
          />
        </div>
        <div>
          <label className="block text-dim text-xs mb-1">To</label>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="input py-1.5 text-sm w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-dim text-xs mb-1">Status</label>
        <div className="flex flex-wrap gap-1">
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
                  opacity: value.statusIds.length === 0 || active ? 1 : 0.4,
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
        </div>
      </div>

      {filterActive && (
        <button
          onClick={() => onChange(emptyFilters)}
          className="btn-ghost text-xs w-full"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

export function applyFilters(entries: Entry[], f: FilterState): Entry[] {
  const q = f.query.trim().toLowerCase();
  return entries.filter((e) => {
    const date = e.occurred_at ?? e.created_at.slice(0, 10);
    if (f.month !== "all" && (date ?? "").slice(0, 7) !== f.month) return false;
    if (f.from && date < f.from) return false;
    if (f.to && date > f.to) return false;
    if (f.statusIds.length > 0 && !f.statusIds.includes(e.status_id ?? ""))
      return false;
    if (q) {
      const hay = [
        e.topic ?? "",
        e.description ?? "",
        e.url,
        e.researcher ?? "",
        (e.keywords ?? []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
