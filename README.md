# News Tracker

Glassmorphic Next.js web app that replaces a Google Sheet for tracking news/updates across niches (AI, Geopolitics, Personal Finance, …). Paste a tweet/article/IG-reel URL → Claude auto-fills topic, description, date, and keywords. No login. Stored in Supabase.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS (glass utilities, dark/light themes)
- Supabase (Postgres + Realtime, anon key, RLS open)
- OpenRouter (default model: `anthropic/claude-haiku-4.5`) for URL → structured data

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the Supabase schema

1. Create a project at https://supabase.com
2. In the dashboard go to **SQL Editor → New query**
3. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**

This creates `niches`, `statuses`, `entries` tables + open RLS policies + seed data (three niches, four statuses).

### 3. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase → Project Settings → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same page, "anon public" key
- `OPENROUTER_API_KEY` — https://openrouter.ai/settings/keys
- *(optional)* `OPENROUTER_MODEL` — defaults to `anthropic/claude-haiku-4.5`. Browse alternatives at https://openrouter.ai/models

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push this repo to GitHub.
2. https://vercel.com/new → import the repo.
3. In project settings, add the same three environment variables.
4. Deploy.

## Usage

- **Home (`/`)** — pick a niche.
- **Niche page (`/<slug>`)** — paste a URL → AI extracts topic/description/date/keywords → row appears.
  - Click any cell to edit it inline. Status is a dropdown. Researcher name is remembered per device.
  - Sort by date occurred / date added / topic / status. Group by week or month.
  - Multiple users see each other's edits live (Supabase Realtime).
- **Manage (`/admin`)** — add/rename/recolor/delete niches and statuses. Mark a status as default for new entries.

## Notes

- **No auth.** The app uses the Supabase anon key directly from the browser; RLS is open for read+write. This is fine for an internal team tool, **not** for public exposure.
- **Twitter / Instagram** — extraction relies on the public oEmbed endpoint and OpenGraph metadata. If a tweet is from a protected/blocked account, the AI will fill what it can; you can edit any cell manually.
- **Costs** — each extract call is one short OpenRouter request (~600 tokens output). Cost depends on the model you pick.
