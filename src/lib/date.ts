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
