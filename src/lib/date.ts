export type Bucket = "none" | "week" | "month";

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day; // ISO week starts Mon
  const out = new Date(d);
  out.setDate(d.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function bucketKey(dateStr: string | null, bucket: Bucket): string {
  if (!dateStr) return "Undated";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Undated";
  if (bucket === "week") {
    const s = startOfWeek(d);
    return `Week of ${s.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }
  if (bucket === "month") {
    const s = startOfMonth(d);
    return s.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseIsoLocal(s: string): Date | null {
  // Treat YYYY-MM-DD as a local date (not UTC) to avoid timezone shifts.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

export function formatDateDMY(s: string | null): string {
  if (!s) return "—";
  const d = parseIsoLocal(s);
  if (!d) return s;
  return `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekOfMonth(d: Date): number {
  return Math.ceil(d.getDate() / 7);
}

// Stable per-week id used to detect transitions between rows.
export function weekId(s: string | null): string {
  if (!s) return "undated";
  const d = parseIsoLocal(s);
  if (!d) return "undated";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-W${weekOfMonth(d)}`;
}

export function weekOfMonthLabel(s: string | null): string {
  if (!s) return "Undated";
  const d = parseIsoLocal(s);
  if (!d) return "Undated";
  return `Week ${weekOfMonth(d)} of ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}
