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
    <div className="space-y-2 text-sm">
      <div>
        <label className="block text-dim text-xs mb-1">Sort by</label>
        <div className="flex gap-2">
          <select
            value={field}
            onChange={(e) =>
              onChange({ field: e.target.value as SortField, dir, bucket })
            }
            className="glass-input py-1.5 text-sm flex-1 min-w-0"
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
            className="btn-ghost text-sm px-2"
            title="Toggle direction"
          >
            {dir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-dim text-xs mb-1">Group by</label>
        <select
          value={bucket}
          onChange={(e) =>
            onChange({ field, dir, bucket: e.target.value as Bucket })
          }
          className="glass-input py-1.5 text-sm w-full"
        >
          <option value="none">None</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </div>
    </div>
  );
}
