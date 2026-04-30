"use client";

import { useState } from "react";

type Props = {
  keywords: string[];
  onChange: (next: string[]) => void | Promise<void>;
};

export default function KeywordChips({ keywords, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  async function remove(k: string) {
    await onChange(keywords.filter((x) => x !== k));
  }

  async function add() {
    const v = draft
      .split(",")
      .map((s) => s.toLowerCase().replace(/^#/, "").trim())
      .filter(Boolean);
    if (v.length === 0) {
      setAdding(false);
      setDraft("");
      return;
    }
    const merged = Array.from(new Set([...keywords, ...v]));
    setDraft("");
    setAdding(false);
    await onChange(merged);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {keywords.map((k) => (
        <span key={k} className="chip">
          {k}
          <button
            onClick={() => remove(k)}
            className="ml-1 opacity-60 hover:opacity-100"
            aria-label={`Remove ${k}`}
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
            if (e.key === "Escape") {
              setAdding(false);
              setDraft("");
            }
          }}
          placeholder="comma,separated"
          className="glass-input text-xs w-32 py-0.5"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="chip opacity-70 hover:opacity-100"
          title="Add keyword"
        >
          + add
        </button>
      )}
    </div>
  );
}
