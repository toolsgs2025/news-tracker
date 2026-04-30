"use client";

import { useState } from "react";

type Props = {
  onSubmit: (url: string) => Promise<void>;
};

export default function UrlInputBox({ onSubmit }: Props) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const v = url.trim();
    if (!v) return;
    try {
      new URL(v);
    } catch {
      setError("Not a valid URL");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(v);
      setUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-strong p-4 sm:p-5">
      <label className="text-sm text-dim mb-2 block">
        Paste a URL — tweet, article, or Instagram reel. AI will fill in the rest.
      </label>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) submit();
          }}
          placeholder="https://x.com/..."
          className="glass-input flex-1"
          disabled={busy}
        />
        <button
          onClick={submit}
          disabled={busy || !url.trim()}
          className="btn-primary whitespace-nowrap"
        >
          {busy ? "Extracting…" : "Extract"}
        </button>
      </div>
      {error && (
        <p className="text-sm mt-2 text-red-400">{error}</p>
      )}
    </div>
  );
}
