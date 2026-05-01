"use client";

import { useEffect, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import { bucketKey, type Bucket } from "@/lib/date";
import type { Entry, Status } from "@/lib/types";
import EditableCell from "./EditableCell";
import KeywordChips from "./KeywordChips";
import StatusDropdown from "./StatusDropdown";

type Props = {
  nicheId: string;
  statuses: Status[];
  rows: Entry[];
  bucket: Bucket;
  emptyMessage: string;
  onChange: () => void;
};

export default function TrackerTable({
  nicheId,
  statuses,
  rows,
  bucket,
  emptyMessage,
  onChange,
}: Props) {
  const sb = getSupabase();

  useEffect(() => {
    const channel = sb
      .channel(`entries-${nicheId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entries",
          filter: `niche_id=eq.${nicheId}`,
        },
        () => onChange()
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [sb, nicheId, onChange]);

  async function update(id: string, patch: Partial<Entry>) {
    const { error } = await sb.from("entries").update(patch).eq("id", id);
    if (error) console.error(error);
    onChange();
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const { error } = await sb.from("entries").delete().eq("id", id);
    if (error) console.error(error);
    onChange();
  }

  const groups = useMemo(() => {
    if (bucket === "none") return [{ key: "", items: rows }];
    const map = new Map<string, Entry[]>();
    for (const e of rows) {
      const k = bucketKey(e.occurred_at, bucket);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [rows, bucket]);

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[7rem]" />
            <col className="w-[16rem]" />
            <col />
            <col className="w-[10rem]" />
            <col className="w-[11rem]" />
            <col className="w-[9.5rem]" />
            <col className="w-[7rem]" />
            <col className="w-[2.5rem]" />
          </colgroup>
          <thead>
            <tr className="text-left text-dim border-b border-white/10">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Topic</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Link</th>
              <th className="px-3 py-2 font-medium">Keywords</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Researcher</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupRows
                key={group.key || "all"}
                group={group}
                statuses={statuses}
                update={update}
                remove={remove}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-dim">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows({
  group,
  statuses,
  update,
  remove,
}: {
  group: { key: string; items: Entry[] };
  statuses: Status[];
  update: (id: string, patch: Partial<Entry>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}) {
  return (
    <>
      {group.key && (
        <tr className="bg-white/[0.03]">
          <td colSpan={8} className="px-3 py-1.5 text-xs uppercase tracking-wide text-dim">
            {group.key}{" "}
            <span className="ml-2 normal-case">({group.items.length})</span>
          </td>
        </tr>
      )}
      {group.items.map((e) => (
        <tr key={e.id} className="row-hover border-b border-white/5 align-top">
          <td className="px-3 py-2">
            <EditableCell
              value={e.occurred_at}
              type="date"
              placeholder="—"
              onSave={(v) => update(e.id, { occurred_at: v })}
            />
          </td>
          <td className="px-3 py-2">
            <EditableCell
              value={e.topic}
              placeholder="topic…"
              onSave={(v) => update(e.id, { topic: v })}
            />
          </td>
          <td className="px-3 py-2">
            <EditableCell
              value={e.description}
              multiline
              placeholder="description…"
              onSave={(v) => update(e.id, { description: v })}
            />
          </td>
          <td className="px-3 py-2">
            <a
              href={e.url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-indigo-300 hover:underline"
              title={e.url}
            >
              {shortUrl(e.url)}
            </a>
          </td>
          <td className="px-3 py-2">
            <KeywordChips
              keywords={e.keywords ?? []}
              onChange={(next) => update(e.id, { keywords: next })}
            />
          </td>
          <td className="px-3 py-2">
            <StatusDropdown
              statuses={statuses}
              value={e.status_id}
              onChange={(v) => update(e.id, { status_id: v })}
            />
          </td>
          <td className="px-3 py-2">
            <EditableCell
              value={e.researcher}
              placeholder="—"
              onSave={(v) => update(e.id, { researcher: v })}
            />
          </td>
          <td className="px-3 py-2">
            <button
              onClick={() => remove(e.id)}
              className="text-dim hover:text-red-400"
              aria-label="Delete"
              title="Delete"
            >
              🗑
            </button>
          </td>
        </tr>
      ))}
    </>
  );
}

function shortUrl(u: string): string {
  try {
    const url = new URL(u);
    const path =
      url.pathname.length > 18 ? url.pathname.slice(0, 18) + "…" : url.pathname;
    return `${url.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return u;
  }
}
