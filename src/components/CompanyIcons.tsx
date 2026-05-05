"use client";

import { useState } from "react";

type Props = {
  sourceUrl?: string | null;
  companies: string[];
  size?: number;
};

export default function CompanyIcons({
  sourceUrl,
  companies,
  size = 14,
}: Props) {
  const sourceDomain = sourceUrl ? domainFromUrl(sourceUrl) : null;
  const merged: string[] = [];
  if (sourceDomain) merged.push(sourceDomain);
  for (const c of companies ?? []) {
    if (c && c !== sourceDomain && !merged.includes(c)) merged.push(c);
  }
  if (merged.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {merged.map((domain, i) => (
        <CompanyIcon
          key={domain}
          domain={domain}
          size={size}
          isSource={i === 0 && !!sourceDomain}
        />
      ))}
    </div>
  );
}

function CompanyIcon({
  domain,
  size,
  isSource,
}: {
  domain: string;
  size: number;
  isSource: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const title = isSource ? `Source: ${domain}` : domain;
  if (failed) {
    return (
      <span
        title={title}
        className="inline-flex items-center justify-center rounded text-[9px] font-medium uppercase"
        style={{
          width: size,
          height: size,
          background: "rgb(var(--border) / 0.1)",
          color: "rgb(var(--text-dim))",
        }}
      >
        {domain[0]}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(
        domain
      )}&sz=64`}
      alt={domain}
      title={title}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}

function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
