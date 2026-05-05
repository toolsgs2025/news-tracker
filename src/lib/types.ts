export type Niche = {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  created_at: string;
};

export type Status = {
  id: string;
  label: string;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
};

export type SourceType = "twitter" | "instagram" | "news" | "other";

export type Entry = {
  id: string;
  niche_id: string;
  url: string;
  topic: string | null;
  description: string | null;
  occurred_at: string | null;
  keywords: string[];
  companies: string[];
  status_id: string | null;
  researcher: string | null;
  source_type: SourceType | null;
  ai_raw: unknown | null;
  created_at: string;
  updated_at: string;
};

export type ExtractResult = {
  topic: string | null;
  description: string | null;
  occurred_at: string | null;
  keywords: string[];
  companies: string[];
  source_type: SourceType;
  ai_raw?: unknown;
};
