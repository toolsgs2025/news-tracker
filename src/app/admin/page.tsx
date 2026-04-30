"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Niche, Status } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminPage() {
  const sb = getSupabase();
  const [niches, setNiches] = useState<Niche[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [n, s] = await Promise.all([
      sb.from("niches").select("*").order("sort_order", { ascending: true }),
      sb.from("statuses").select("*").order("sort_order", { ascending: true }),
    ]);
    if (n.error) setError(n.error.message);
    if (s.error) setError(s.error.message);
    setNiches((n.data ?? []) as Niche[]);
    setStatuses((s.data ?? []) as Status[]);
  }, [sb]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Niche actions
  const [newNiche, setNewNiche] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  async function addNiche() {
    const name = newNiche.trim();
    if (!name) return;
    const slug = slugify(name);
    const sort_order = (niches[niches.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await sb
      .from("niches")
      .insert({ name, slug, color: newColor, sort_order });
    if (error) {
      setError(error.message);
      return;
    }
    setNewNiche("");
    setNewColor("#6366f1");
    reload();
  }

  async function updateNiche(id: string, patch: Partial<Niche>) {
    const { error } = await sb.from("niches").update(patch).eq("id", id);
    if (error) setError(error.message);
    reload();
  }

  async function deleteNiche(id: string) {
    if (
      !confirm(
        "Delete this niche? All its entries will be deleted too. This cannot be undone."
      )
    )
      return;
    const { error } = await sb.from("niches").delete().eq("id", id);
    if (error) setError(error.message);
    reload();
  }

  // Status actions
  const [newStatus, setNewStatus] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#94a3b8");

  async function addStatus() {
    const label = newStatus.trim();
    if (!label) return;
    const sort_order = (statuses[statuses.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await sb
      .from("statuses")
      .insert({ label, color: newStatusColor, sort_order, is_default: false });
    if (error) {
      setError(error.message);
      return;
    }
    setNewStatus("");
    setNewStatusColor("#94a3b8");
    reload();
  }

  async function updateStatus(id: string, patch: Partial<Status>) {
    const { error } = await sb.from("statuses").update(patch).eq("id", id);
    if (error) setError(error.message);
    reload();
  }

  async function setDefaultStatus(id: string) {
    // Clear all then set one
    await sb.from("statuses").update({ is_default: false }).neq("id", id);
    await sb.from("statuses").update({ is_default: true }).eq("id", id);
    reload();
  }

  async function deleteStatus(id: string) {
    if (!confirm("Delete this status? Existing entries will lose this status."))
      return;
    const { error } = await sb.from("statuses").delete().eq("id", id);
    if (error) setError(error.message);
    reload();
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn-ghost text-sm">
            ← Home
          </Link>
          <h1 className="text-2xl font-semibold">Manage</h1>
        </div>
        <ThemeToggle />
      </header>

      {error && <div className="glass p-3 text-sm text-red-300">{error}</div>}

      <section className="glass p-5">
        <h2 className="text-lg font-medium mb-4">Niches</h2>
        <div className="space-y-2 mb-4">
          {niches.map((n) => (
            <div
              key={n.id}
              className="flex flex-wrap items-center gap-2 p-2 rounded row-hover"
            >
              <input
                type="color"
                value={n.color}
                onChange={(e) => updateNiche(n.id, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent"
                title="Color"
              />
              <input
                defaultValue={n.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== n.name)
                    updateNiche(n.id, { name, slug: slugify(name) });
                }}
                className="glass-input flex-1 min-w-[12rem]"
              />
              <span className="text-dim text-sm">/{n.slug}</span>
              <button
                onClick={() => deleteNiche(n.id)}
                className="btn-ghost text-sm hover:text-red-400"
              >
                Delete
              </button>
            </div>
          ))}
          {niches.length === 0 && (
            <p className="text-dim text-sm">No niches yet.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-9 h-9 rounded cursor-pointer bg-transparent"
          />
          <input
            value={newNiche}
            onChange={(e) => setNewNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNiche()}
            placeholder="New niche name"
            className="glass-input flex-1 min-w-[12rem]"
          />
          <button onClick={addNiche} className="btn-primary">
            Add niche
          </button>
        </div>
      </section>

      <section className="glass p-5">
        <h2 className="text-lg font-medium mb-4">Statuses</h2>
        <p className="text-dim text-sm mb-3">
          The default status is auto-applied to newly extracted entries.
        </p>
        <div className="space-y-2 mb-4">
          {statuses.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-2 p-2 rounded row-hover"
            >
              <input
                type="color"
                value={s.color}
                onChange={(e) => updateStatus(s.id, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent"
              />
              <input
                defaultValue={s.label}
                onBlur={(e) => {
                  const label = e.target.value.trim();
                  if (label && label !== s.label) updateStatus(s.id, { label });
                }}
                className="glass-input flex-1 min-w-[12rem]"
              />
              <button
                onClick={() => setDefaultStatus(s.id)}
                className={`btn-ghost text-sm ${s.is_default ? "opacity-100" : "opacity-60"}`}
                title="Set as default for new entries"
              >
                {s.is_default ? "★ default" : "set default"}
              </button>
              <button
                onClick={() => deleteStatus(s.id)}
                className="btn-ghost text-sm hover:text-red-400"
              >
                Delete
              </button>
            </div>
          ))}
          {statuses.length === 0 && (
            <p className="text-dim text-sm">No statuses yet.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={newStatusColor}
            onChange={(e) => setNewStatusColor(e.target.value)}
            className="w-9 h-9 rounded cursor-pointer bg-transparent"
          />
          <input
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStatus()}
            placeholder="New status label"
            className="glass-input flex-1 min-w-[12rem]"
          />
          <button onClick={addStatus} className="btn-primary">
            Add status
          </button>
        </div>
      </section>
    </main>
  );
}
