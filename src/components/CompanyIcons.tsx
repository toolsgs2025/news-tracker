"use client";

import { useState } from "react";

type Props = {
  companies: string[];
  size?: number;
};

export default function CompanyIcons({ companies, size = 14 }: Props) {
  if (!companies || companies.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {companies.map((domain) => (
        <CompanyIcon key={domain} domain={domain} size={size} />
      ))}
    </div>
  );
}

function CompanyIcon({ domain, size }: { domain: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        title={domain}
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
      title={domain}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
