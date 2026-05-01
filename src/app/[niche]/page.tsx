"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { todayIso, type Bucket } from "@/lib/date";
import type { Entry, ExtractResult, Niche, Status } from "@/lib/types";
import UrlInputBox from "@/components/UrlInputBox";
import TrackerTable from "@/components/TrackerTable";
import ThemeToggle from "@/components/ThemeToggle";
import ResearcherBadge, { getResearcher } from "@/components/ResearcherBadge";
import FilterBar, {
  applyFilters,
  emptyFilters,
  type FilterState,
} from "@/components/FilterBar";
import SortControls, {
  type SortDir,
  type SortField,
} from "@/components/SortControls";

export const dynamic = "force-dynamic";

export default function NichePage({
  params,
}: {
  params: Promise<{ niche: string }>;
}) {
  const { niche: slug } = use(params);
  const sb = getSupabase();
  const [niche, setNiche] = useState<Niche | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sortField, setSortField] = useState<SortField>("occurred_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [bucket, setBucket] = useState<Bucket>("none");

  const reloadEntries = useCallback(
    async (nicheId: string) => {
      const { data, error } = await sb
        .from("entries")
        .select("*")
        .eq("niche_id", nicheId)
        .order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
        return;
      }
      setEntries((data ?? []) as Entry[]);
    },
    [sb]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: nicheData, error: nErr }, { data: statusData, error: sErr }] =
          await Promise.all([
            sb.from("niches").select("*").eq("slug", slug).maybeSingle(),
            sb.from("statuses").select("*").order("sort_order", { ascending: true }),
          ]);
        if (cancelled) return;
        if (nErr) {
          setError(nErr.message);
          setLoading(false);
          return;
        }
        if (!nicheData) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        if (sErr) setError(sErr.message);
        setNiche(nicheData as Niche);
        setStatuses(((statusData ?? []) as Status[]));
        await reloadEntries((nicheData as Niche).id);
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, sb, reloadEntries]);

  async function handleSubmit(url: string) {
    if (!niche) return;
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.detail || j.error || `Extraction failed (${res.status})`);
    }
    const result = (await res.json()) as ExtractResult;
    const defaultStatus = statuses.find((s) => s.is_default) ?? statuses[0];
    const researcher = getResearcher() || null;
    const { error: insErr } = await sb.from("entries").insert({
      niche_id: niche.id,
      url,
      topic: result.topic,
      description: result.description,
      occurred_at: result.occurred_at,
      keywords: result.keywords,
      status_id: defaultStatus?.id ?? null,
      source_type: result.source_type,
      researcher,
      ai_raw: result.ai_raw ?? null,
    });
    if (insErr) throw new Error(insErr.message);
    await reloadEntries(niche.id);
  }

  const filtered = useMemo(
    () => applyFilters(entries, filters),
    [entries, filters]
  );

  const rows = useMemo(() => {
    const statusOrder = new Map(statuses.map((s) => [s.id, s.sort_order]));
    const arr = [...filtered];
    arr.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortField === "topic") {
        return mul * (a.topic ?? "").localeCompare(b.topic ?? "");
      }
      if (sortField === "status") {
        const ao = statusOrder.get(a.status_id ?? "") ?? 999;
        const bo = statusOrder.get(b.status_id ?? "") ?? 999;
        return mul * (ao - bo);
      }
      const aDate = a[sortField] ?? "";
      const bDate = b[sortField] ?? "";
      return mul * (aDate < bDate ? -1 : aDate > bDate ? 1 : 0);
    });
    return arr;
  }, [filtered, sortField, sortDir, statuses]);

  const filterActive =
    filters.query !== "" ||
    filters.month !== "all" ||
    filters.statusIds.length > 0 ||
    filters.from !== "" ||
    filters.to !== "";

  function exportCsv() {
    if (!niche) return;
    const statusMap = new Map(statuses.map((s) => [s.id, s.label]));
    const header = [
      "Date",
      "Topic",
      "Description",
      "URL",
      "Keywords",
      "Status",
      "Researcher",
      "Source",
      "Added",
    ];
    const data = rows.map((e) => [
      e.occurred_at ?? "",
      e.topic ?? "",
      e.description ?? "",
      e.url,
      (e.keywords ?? []).join(", "),
      statusMap.get(e.status_id ?? "") ?? "",
      e.researcher ?? "",
      e.source_type ?? "",
      e.created_at,
    ]);
    const csv = [header, ...data]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${niche.slug}-news-${todayIso()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyForSheets() {
    const statusMap = new Map(statuses.map((s) => [s.id, s.label]));
    const header = [
      "Date",
      "Topic",
      "Description",
      "URL",
      "Keywords",
      "Status",
      "Researcher",
      "Source",
      "Added",
    ];
    const data = rows.map((e) => [
      e.occurred_at ?? "",
      e.topic ?? "",
      e.description ?? "",
      e.url,
      (e.keywords ?? []).join(", "),
      statusMap.get(e.status_id ?? "") ?? "",
      e.researcher ?? "",
      e.source_type ?? "",
      e.created_at,
    ]);
    const tsv = [header, ...data]
      .map((row) =>
        row.map((c) => String(c ?? "").replace(/[\t\r\n]/g, " ")).join("\t")
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      alert(`Copied ${data.length} rows. Paste into a Google Sheet.`);
    } catch {
      alert("Couldn't access clipboard. Try the CSV download instead.");
    }
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="glass p-6 text-dim">Loading {slug}…</div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="glass p-6">
          <h1 className="text-xl font-semibold mb-2">Niche not found</h1>
          <p className="text-dim mb-4">
            No niche with slug <code>{slug}</code>.
          </p>
          <Link href="/" className="btn-primary inline-block">
            Back to niches
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <aside className="lg:w-72 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto p-3 lg:border-r lg:border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="btn-ghost text-xs">
            ← All niches
          </Link>
          <ThemeToggle />
        </div>

        {niche && (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: niche.color }}
            />
            <h1 className="text-lg font-semibold leading-none">{niche.name}</h1>
          </div>
        )}

        <div className="glass p-3">
          <FilterBar
            entries={entries}
            statuses={statuses}
            value={filters}
            onChange={setFilters}
          />
        </div>

        <div className="glass p-3">
          <SortControls
            field={sortField}
            dir={sortDir}
            bucket={bucket}
            onChange={(n) => {
              setSortField(n.field);
              setSortDir(n.dir);
              setBucket(n.bucket);
            }}
          />
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-3">
          <ResearcherBadge />
          <Link href="/admin" className="btn-ghost text-sm text-center">
            Manage niches & statuses
          </Link>
        </div>
      </aside>

      <section className="flex-1 min-w-0 p-3 lg:p-4 space-y-3">
        {error && (
          <div className="glass p-3 text-sm text-red-300">{error}</div>
        )}

        <UrlInputBox onSubmit={handleSubmit} />

        <div className="glass p-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-dim px-1">
            {filterActive
              ? `${rows.length} of ${entries.length} entries`
              : `${entries.length} entries`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyForSheets}
              disabled={rows.length === 0}
              className="btn-ghost text-sm"
              title="Copy filtered rows as TSV — paste into a Google Sheet"
            >
              📋 Copy for Sheets
            </button>
            <button
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="btn-primary text-sm"
              title="Download filtered rows as CSV"
            >
              ⬇ Export CSV
            </button>
          </div>
        </div>

        {niche && (
          <TrackerTable
            nicheId={niche.id}
            statuses={statuses}
            rows={rows}
            bucket={bucket}
            emptyMessage={
              entries.length === 0
                ? "No entries yet. Paste a URL above to get started."
                : "No entries match the current filters."
            }
            onChange={() => reloadEntries(niche.id)}
          />
        )}
      </section>
    </div>
  );
}

function escapeCsv(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
