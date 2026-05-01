"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Entry, ExtractResult, Niche, Status } from "@/lib/types";
import UrlInputBox from "@/components/UrlInputBox";
import TrackerTable from "@/components/TrackerTable";
import ThemeToggle from "@/components/ThemeToggle";
import ResearcherBadge, { getResearcher } from "@/components/ResearcherBadge";

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

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn-ghost text-sm">
            ← All niches
          </Link>
          {niche && (
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: niche.color }}
              />
              <h1 className="text-2xl font-semibold">{niche.name}</h1>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ResearcherBadge />
          <Link href="/admin" className="btn-ghost text-sm">
            Manage
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {error && (
        <div className="glass p-4 text-sm text-red-300">{error}</div>
      )}

      <UrlInputBox onSubmit={handleSubmit} />

      {niche && (
        <TrackerTable
          nicheId={niche.id}
          nicheSlug={niche.slug}
          statuses={statuses}
          entries={entries}
          onChange={() => reloadEntries(niche.id)}
        />
      )}
    </main>
  );
}
