"use client";

import type { Status } from "@/lib/types";

type Props = {
  statuses: Status[];
  value: string | null;
  onChange: (next: string | null) => void | Promise<void>;
};

export default function StatusDropdown({ statuses, value, onChange }: Props) {
  const current = statuses.find((s) => s.id === value);
  return (
    <div className="relative inline-flex items-center">
      <span
        className="absolute left-2 w-2.5 h-2.5 rounded-full pointer-events-none"
        style={{ background: current?.color || "#94a3b8" }}
      />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="glass-input text-sm pl-7 pr-7 appearance-none cursor-pointer"
      >
        <option value="">—</option>
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
