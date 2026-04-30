import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractResult, SourceType } from "./types";

const MODEL = "claude-haiku-4-5";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY in environment");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

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
  "keywords": array of 3-7 lowercase keywords/tags (no #, no spaces inside multi-word terms — use hyphens)
}

Rules:
- Output ONLY the JSON object. No prose, no code fences.
- If unsure about a field, use null (or [] for keywords).
- Never invent facts that are not in the context.`;

function safeJsonExtract(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
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

  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 600,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Context JSON:\n${JSON.stringify(userPayload, null, 2)}\n\nReturn JSON only.`,
      },
    ],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text");
  }

  let parsed: {
    topic?: string | null;
    description?: string | null;
    occurred_at?: string | null;
    keywords?: unknown;
  };
  try {
    parsed = safeJsonExtract(textBlock.text) as typeof parsed;
  } catch {
    return {
      topic: ctx.title,
      description: ctx.description,
      occurred_at: ctx.ogPublished ? ctx.ogPublished.slice(0, 10) : null,
      keywords: [],
      source_type: source,
      ai_raw: { error: "parse_failed", raw: textBlock.text },
    };
  }

  const keywords = Array.isArray(parsed.keywords)
    ? (parsed.keywords as unknown[])
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.toLowerCase().replace(/^#/, "").trim())
        .filter(Boolean)
        .slice(0, 10)
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
    source_type: source,
    ai_raw: { context: ctx, model_output: textBlock.text },
  };
}
