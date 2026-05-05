import "server-only";
import type { ExtractResult, SourceType } from "./types";

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export function detectSourceType(url: string): SourceType {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "twitter.com" || host === "x.com" || host.endsWith(".x.com"))
      return "twitter";
    if (host === "instagram.com" || host.endsWith(".instagram.com"))
      return "instagram";
    if (
      host.endsWith(".com") ||
      host.endsWith(".org") ||
      host.endsWith(".net") ||
      host.endsWith(".io") ||
      host.endsWith(".co") ||
      host.endsWith(".news")
    )
      return "news";
    return "other";
  } catch {
    return "other";
  }
}

type PageContext = {
  title: string | null;
  description: string | null;
  ogPublished: string | null;
  twitterText: string | null;
  rawSnippet: string | null;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function extractMeta(html: string, key: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    });
    clearTimeout(t);
    return res;
  } catch {
    return null;
  }
}

async function fetchOEmbed(url: string): Promise<string | null> {
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(
    url
  )}&omit_script=1`;
  const res = await fetchWithTimeout(oembedUrl, 5000);
  if (!res || !res.ok) return null;
  try {
    const j = (await res.json()) as { html?: string; author_name?: string };
    if (!j.html) return null;
    const text = j.html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return j.author_name ? `@${j.author_name}: ${text}` : text;
  } catch {
    return null;
  }
}

async function fetchPageContext(url: string, source: SourceType): Promise<PageContext> {
  const ctx: PageContext = {
    title: null,
    description: null,
    ogPublished: null,
    twitterText: null,
    rawSnippet: null,
  };

  if (source === "twitter") {
    ctx.twitterText = await fetchOEmbed(url);
  }

  const res = await fetchWithTimeout(url);
  if (res && res.ok) {
    const html = await res.text();
    const truncated = html.slice(0, 200_000);
    const titleMatch = truncated.match(/<title[^>]*>([^<]+)<\/title>/i);
    ctx.title =
      extractMeta(truncated, "og:title") ||
      extractMeta(truncated, "twitter:title") ||
      (titleMatch ? decodeEntities(titleMatch[1]).trim() : null);
    ctx.description =
      extractMeta(truncated, "og:description") ||
      extractMeta(truncated, "twitter:description") ||
      extractMeta(truncated, "description");
    ctx.ogPublished =
      extractMeta(truncated, "article:published_time") ||
      extractMeta(truncated, "og:article:published_time") ||
      extractMeta(truncated, "datePublished") ||
      extractMeta(truncated, "publish-date");
    const stripped = truncated
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    ctx.rawSnippet = stripped.slice(0, 4000);
  }

  return ctx;
}

const SYSTEM = `You are a news-research assistant.
Given a URL and any context the user has already gathered (page title, meta description, tweet text, raw snippet), return STRICT JSON only with these fields:

{
  "topic": short headline-style title (string, <= 110 chars),
  "description": 1-2 sentence neutral summary of the post/article,
  "occurred_at": YYYY-MM-DD date the event/post happened (best guess from context; null if unknown),
  "keywords": array of 3-7 lowercase keywords/tags (no #, no spaces inside multi-word terms — use hyphens),
  "companies": array of 0-5 lowercase domain names of companies/products mentioned in the content (e.g. "openai.com", "anthropic.com", "google.com", "meta.com"). Use the official root domain only — no protocol, no path, no subdomain. Empty array [] if none clearly identified.
}

Rules:
- Output ONLY the JSON object. No prose, no code fences.
- If unsure about a field, use null (or [] for arrays).
- Never invent facts that are not in the context.`;

function safeJsonExtract(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callOpenRouter(userMessage: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Missing OPENROUTER_API_KEY in environment");
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://news-tracker.local",
      "X-Title": "News Tracker",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned no content");
  return content;
}

export async function extractFromUrl(url: string): Promise<ExtractResult> {
  const source = detectSourceType(url);
  const ctx = await fetchPageContext(url, source);

  const userPayload = {
    url,
    source_type: source,
    title: ctx.title,
    meta_description: ctx.description,
    og_published: ctx.ogPublished,
    tweet_text: ctx.twitterText,
    page_snippet: ctx.rawSnippet,
  };

  const text = await callOpenRouter(
    `Context JSON:\n${JSON.stringify(userPayload, null, 2)}\n\nReturn JSON only.`
  );

  let parsed: {
    topic?: string | null;
    description?: string | null;
    occurred_at?: string | null;
    keywords?: unknown;
    companies?: unknown;
  };
  try {
    parsed = safeJsonExtract(text) as typeof parsed;
  } catch {
    return {
      topic: ctx.title,
      description: ctx.description,
      occurred_at: ctx.ogPublished ? ctx.ogPublished.slice(0, 10) : null,
      keywords: [],
      companies: [],
      source_type: source,
      ai_raw: { error: "parse_failed", raw: text },
    };
  }

  const keywords = Array.isArray(parsed.keywords)
    ? (parsed.keywords as unknown[])
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.toLowerCase().replace(/^#/, "").trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const companies = Array.isArray(parsed.companies)
    ? (parsed.companies as unknown[])
        .filter((c): c is string => typeof c === "string")
        .map((c) =>
          c
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .split("/")[0]
            .trim()
        )
        .filter((c) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(c))
        .slice(0, 6)
    : [];

  const occurred =
    typeof parsed.occurred_at === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(parsed.occurred_at)
      ? parsed.occurred_at
      : null;

  return {
    topic: parsed.topic ?? ctx.title ?? null,
    description: parsed.description ?? ctx.description ?? null,
    occurred_at: occurred,
    keywords,
    companies,
    source_type: source,
    ai_raw: { context: ctx, model_output: text },
  };
}
