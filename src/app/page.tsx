"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Niche } from "@/lib/types";
import NicheSelector from "@/components/NicheSelector";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const [niches, setNiches] = useState<Niche[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from("niches")
          .select("*")
          .order("sort_order", { ascending: true });
        if (cancelled) return;
        if (error) {
          setError(error.message);
          return;
        }
        setNiches((data ?? []) as Niche[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">News Tracker</h1>
          <p className="text-dim mt-1">Pick a niche to start tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="btn-ghost text-sm">
            Manage
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {error && (
        <div className="glass p-4 text-sm text-red-300">
          Failed to load niches: {error}
          <p className="text-dim mt-2">
            Did you run <code>supabase/schema.sql</code> and set{" "}
            <code>.env.local</code>?
          </p>
        </div>
      )}

      {niches === null && !error && (
        <div className="glass p-6 text-dim">Loading…</div>
      )}

      {niches && <NicheSelector niches={niches} />}
    </main>
  );
}
