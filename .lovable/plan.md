# StudyPilot AI — V2 Plan

V2 is a large scope. Rather than ship everything half-built, I'll deliver it in three focused phases so each phase lands polished. I need one decision from you before phase 3.

## Phase 1 — Document intelligence, voice, exports, gamification, focus (self-contained)

These have no external OAuth dependencies and unlock the biggest UX wins.

**Document ingestion (client-side parsing, then AI summarize)**

- **PDF** → `pdfjs-dist` extracts text in the browser.
- **DOCX** → `mammoth` extracts raw text.
- **Images** → `tesseract.js` OCR (English by default; language pack lazy-loaded).
- Wire all three into the existing Notes Summarizer with progress states.

**Voice Notes**

- Recording uses `MediaRecorder` → uploads WAV/webm to a new server function.
- Transcription via **Lovable AI STT** (`openai/gpt-4o-transcribe`, streaming SSE) — no user API key needed.
- Auto-summarize transcript with existing summarize pipeline.

**Exports**

- Summary/assignment export to **PDF** via `jspdf` and **DOCX** via `docx`.
- Client-side generation — no server round trip.

**Gamification**

- New tables: `user_stats` (xp, level, current_streak, longest_streak, last_active_date), `user_badges`.
- XP awarded on: task completion, notes summarized, flashcard quiz score, study session (Pomodoro).
- Streak recomputed on any XP event.
- Badges: First Task, 7-Day Streak, 30-Day Streak, 100 Tasks, Quiz Master, Voice Scholar.
- **Leaderboard**: `public.leaderboard` view (top 50 by XP) — pseudonymous, `full_name` only.
- Dashboard widget: XP bar, level, streak flame, badges grid.

**Pomodoro Focus Timer**

- New route `/focus`. Configurable work/break lengths (default 25/5), long break every 4 cycles.
- Awards XP on completed work interval; logs a `focus_session` row for analytics.

**Real Analytics**

- Rebuild `/analytics` on `focus_sessions`, `tasks` (completed count/day), `notes` (created/day), `chat_messages` (AI usage), `user_stats`. Real Recharts, no demo values.

## Phase 2 — AI Second Brain (RAG over user data)

- Add `pgvector` extension. New `embeddings` table (`owner_id`, `source_type`, `source_id`, `content`, `embedding vector(768)`).
- On write of notes / voice transcripts / tasks / events, generate embeddings (`google/gemini-embedding-2` via Lovable AI).
- New route `/second-brain`: chat that retrieves top-k user-owned chunks and answers with citations back to source notes/tasks/events.
- Uses existing chat UI patterns; server-side retrieval keeps everything under RLS.

## Phase 3 — Google integrations (requires your decision)

Google Calendar / Drive / Gmail can be wired two different ways. **This is the one thing I need you to pick** because it changes the whole setup:

- **A. Builder-owned (App Connectors)** — you connect _your_ Google account once, and every StudyPilot user sees data from _your_ Google account. Fine for a personal/demo app, wrong for a real multi-user product.
- **B. Per-user (App User Connectors)** — each StudyPilot user connects _their own_ Google account and sees their own Calendar/Drive/Gmail. Requires you to register one Google OAuth client (I'll walk you through the console steps). This is the correct model for a real student productivity app.

I'll assume **B (per-user)** unless you say otherwise, and I'll pause at the start of Phase 3 to have you run through the OAuth client setup.

Scope in phase 3:

- Calendar: two-way sync of `events` with Google Calendar (import upcoming, export study plan sessions).
- Drive: import documents into Notes Summarizer directly by picking a Drive file.
- Gmail: read-only assistant that surfaces academic emails (deadlines, professor mail) into the Second Brain.

## Cross-cutting polish (spread across all phases)

- Motion for React micro-interactions on cards, page transitions, XP gains, streak flame.
- Skeleton loaders on every async surface.
- Mobile: bottom tab bar under `md`, sidebar collapses to sheet, larger tap targets, safe-area padding.
- Route-level code splitting via TanStack lazy routes; images lazy-loaded; fonts preconnected.
- SEO: per-route `head()` titles/descriptions, `sitemap.xml`, `robots.txt`.
- Error boundaries + toasts on every mutation.

## Technical notes (for your reference)

- `pdfjs-dist` worker served from `public/`; `tesseract.js` core lazy-imported so the base bundle stays small.
- Voice recorder uses PCM → WAV encoding on the client (per Lovable STT best practice) to avoid Safari mp4 vs webm mismatch.
- Gamification writes go through a `SECURITY DEFINER` `award_xp(event_type)` function so XP rules stay server-side and cheat-proof.
- Leaderboard is a `SECURITY INVOKER` view over `user_stats + profiles` with an `anon`-safe projection (name + xp + level only).
- Embeddings table has an `ivfflat` index on `embedding vector_cosine_ops`.
- All new tables get `GRANT`s + RLS `auth.uid() = user_id` in the same migration.

## What ships when

1. **This turn**: Phase 1 in full.
2. **Next turn (on your "continue")**: Phase 2 Second Brain.
3. **After you pick A or B**: Phase 3 Google integrations.

**One question before I start Phase 1**: for Google integrations later on, do you want per-user (each student connects their own Google) or builder-owned (your account only)? I'll default to per-user if you don't say.
