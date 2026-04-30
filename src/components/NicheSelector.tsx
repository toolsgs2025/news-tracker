"use client";

import Link from "next/link";
import type { Niche } from "@/lib/types";

export default function NicheSelector({ niches }: { niches: Niche[] }) {
  if (niches.length === 0) {
    return (
      <div className="glass p-6 text-center">
        <p className="text-dim mb-3">No niches yet.</p>
        <Link href="/admin" className="btn-primary inline-block">
          Create your first niche
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {niches.map((n) => (
        <Link
          key={n.id}
          href={`/${n.slug}`}
          className="glass p-6 hover:scale-[1.02] transition-transform relative overflow-hidden block"
          style={{
            backgroundImage: `linear-gradient(135deg, ${n.color}33, transparent 70%)`,
          }}
        >
          <div
            className="w-3 h-3 rounded-full mb-3"
            style={{ background: n.color }}
          />
          <h2 className="text-xl font-semibold mb-1">{n.name}</h2>
          <p className="text-sm text-dim">Open tracker →</p>
        </Link>
      ))}
    </div>
  );
}
