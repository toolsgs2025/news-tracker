"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string | null;
  onSave: (value: string | null) => void | Promise<void>;
  placeholder?: string;
  multiline?: boolean;
  type?: "text" | "date" | "url";
  className?: string;
};

export default function EditableCell({
  value,
  onSave,
  placeholder = "—",
  multiline = false,
  type = "text",
  className = "",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      if ("select" in ref.current) ref.current.select();
    }
  }, [editing]);

  async function commit() {
    setEditing(false);
    const next = draft.trim();
    if ((value ?? "") === next) return;
    await onSave(next === "" ? null : next);
  }

  function cancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`text-left w-full block px-1 py-1 rounded hover:bg-white/5 transition ${className}`}
        title="Click to edit"
      >
        {value ? (
          type === "url" ? (
            <span className="break-all">{value}</span>
          ) : (
            <span className="whitespace-pre-wrap">{value}</span>
          )
        ) : (
          <span className="text-dim italic">{placeholder}</span>
        )}
      </button>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={(el) => {
          ref.current = el;
        }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
        }}
        rows={3}
        className={`input text-sm resize-y ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <input
      ref={(el) => {
        ref.current = el;
      }}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancel();
        if (e.key === "Enter") commit();
      }}
      className={`input text-sm ${className}`}
      placeholder={placeholder}
    />
  );
}
