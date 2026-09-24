# PRD — गाजियाबाद टाइम्स (Ghaziabad Times)

## Original Problem Statement
Build an automated news fetching module that pulls breaking news/latest updates from public RSS feeds (no manual API config), restricted strictly to news published within the last 8 hours, auto-saves items to DB with status 'Pending_Review', and displays them in an Admin Dashboard.

## User Choices
- Sources: general breaking + business + Indian regional (Ghaziabad, Noida/Greater Noida, Meerut, Hapur, Bulandshahr, Baghpat, Delhi, UP govt/police/bureaucracy transfers & orders, education, medical, employment, sports, cinema/TV).
- Auto-fetch every 30 minutes (platform cron).
- No login — open Admin Dashboard.
- Admin actions: Approve / Reject / Edit + manual compose (paste own news + photo → AI rewrites to journalistic Hindi + watermark photo "गाजियाबाद टाइम्स").
- Store title/summary/source/image/published time/link + content.
- Whole site in Hindi with Hindi/English toggle. Newest first, no duplicates.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). RSS via `feedparser` over free Google News Hindi feeds (no API keys). AI rewrite via Emergent LLM key (`gemini-3-flash-preview`). Image watermark via Pillow (raqm Devanagari shaping) + Emergent object storage.
- **Frontend**: React + Tailwind + shadcn/ui. Public portal (`/`, `/article/:id`) + Admin (`/admin`). Language context (hi/en).
- **Cron**: `.emergent/crons.yml` → `POST /api/cron/fetch-news` every 30 min (Bearer `WEBHOOK_CRON_SECRET`, backgrounds work).

## Key Files
- `backend/server.py` — all `/api` routes; `run_fetch()` (8h window + sha256 dedup); `ai_rewrite()`.
- `backend/feeds.py` — FEEDS + CATEGORIES.
- `backend/storage.py` — `add_watermark()`, object storage.
- `frontend/src/pages/{Home,Article,Admin}.jsx`, `components/{Header,BreakingTicker,NewsCard,Footer}.jsx`, `context/LanguageContext.jsx`.

## Implemented (2026-06)
- Auto RSS fetch, strict 8-hour filter, dedup, Pending_Review save. [verified: 314 old skipped, dedup working]
- Admin dashboard: KPIs, status tabs (Pending/Approved/Rejected), source filter, Fetch-Now, auto-refresh, Approve/Reject/Edit/Delete.
- Manual compose: paste news → AI journalistic Hindi rewrite → photo upload with "गाजियाबाद टाइम्स" watermark.
- Public Hindi portal: masthead, breaking ticker, category sections, article page.
- Hindi/English UI toggle.
- 30-min cron wired + verified (401 without auth, 200 accepted with auth).
- Full test pass: 18/18 backend, all frontend flows.

## Backlog / Next
- P1: Per-article "Translate to English" via LLM (content currently source-language; UI chrome toggles).
- P2: Auto-approve rules / bulk approve; category-specific placeholder images; full-article scraping.
- P2: Admin auth (currently open per user choice).
