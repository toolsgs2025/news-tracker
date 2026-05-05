"use client";

import { useEffect, useState } from "react";

const KEY = "news-tracker-researcher";

export function getResearcher(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setResearcher(name: string) {
  try {
    localStorage.setItem(KEY, name);
  } catch {}
}

export default function ResearcherBadge() {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setName(getResearcher());
  }, []);

  function save(value: string) {
    const trimmed = value.trim();
    setName(trimmed);
    setResearcher(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={name}
        onBlur={(e) => save(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save((e.target as HTMLInputElement).value);
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="Your name"
        className="input text-sm w-40"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="btn-ghost text-sm"
      title="Click to set your name (saved on this device)"
    >
      <span className="text-dim">👤</span>{" "}
      <span>{name || "Set your name"}</span>
    </button>
  );
}
