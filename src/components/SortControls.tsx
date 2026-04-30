"use client";

import type { Bucket } from "@/lib/date";

export type SortField = "occurred_at" | "created_at" | "topic" | "status";
export type SortDir = "asc" | "desc";

type Props = {
  field: SortField;
  dir: SortDir;
  bucket: Bucket;
  onChange: (next: { field: SortField; dir: SortDir; bucket: Bucket }) => void;
};

export default function SortControls({ field, dir, bucket, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-dim">Sort by</span>
      <select
        value={field}
        onChange={(e) =>
          onChange({ field: e.target.value as SortField, dir, bucket })
        }
        className="glass-input py-1 text-sm"
      >
        <option value="occurred_at">Date occurred</option>
        <option value="created_at">Date added</option>
        <option value="topic">Topic</option>
        <option value="status">Status</option>
      </select>
      <button
        onClick={() =>
          onChange({ field, dir: dir === "asc" ? "desc" : "asc", bucket })
        }
        className="btn-ghost text-sm"
        title="Toggle direction"
      >
        {dir === "asc" ? "↑ Asc" : "↓ Desc"}
      </button>
      <span className="text-dim ml-2">Group by</span>
      <select
        value={bucket}
        onChange={(e) =>
          onChange({ field, dir, bucket: e.target.value as Bucket })
        }
        className="glass-input py-1 text-sm"
      >
        <option value="none">None</option>
        <option value="week">Week</option>
        <option value="month">Month</option>
      </select>
    </div>
  );
}
