# StudyPilot AI

**Study Smarter. Learn Faster. Achieve More.**

An all-in-one AI productivity assistant for students — chat with an AI tutor, summarize any document, generate flashcards & mock exams, plan your semester, and track progress with gamified analytics.

## ✨ Features

- **AI Chat Assistant** — Ask anything: DSA, math, coding, essays.
- **AI Tutor** — Step-by-step explanations with Mermaid diagrams.
- **Second Brain (RAG)** — Ask questions grounded in your uploaded notes, tasks, and events.
- **Notes Summarizer** — Upload PDF / DOCX / TXT / images (OCR) → summary, key points, flashcards, quiz.
- **Exam Mode** — Adaptive mock tests with instant scoring and weak-topic detection.
- **Career Assistant** — ATS resume analyzer, cover letter, LinkedIn headline, interview prep.
- **AI Insights** — Personalized productivity coach.
- **Study Planner** — Smart timetables from your subjects and exam date.
- **Kanban To-Do** — Drag-and-drop task board with priorities.
- **Calendar** — Monthly / weekly view with exam countdown.
- **Voice Notes** — Speech-to-text with automatic summary.
- **Pomodoro Focus Timer** — With XP rewards.
- **Flashcards + Quiz Mode** — Auto-generated from any topic.
- **PDF Chat** — Ask questions about any document.
- **Analytics** — Real charts of study hours, tasks, streaks, XP.
- **Gamification** — Streaks, XP, badges, leaderboard.
- **Ask AI Fab** — Floating AI shortcut on every page (Ctrl/Cmd+K).
- **Demo Mode** — One-click demo account preloaded with realistic data.
- **PWA** — Installable, dark-first premium UI.

## 🏗️ Architecture

```
Client (React 19 + TanStack Start SSR)
  │
  ├── Routes (file-based, src/routes/)
  ├── UI (Tailwind v4 + shadcn/ui + Framer Motion)
  │
  ▼
Server Functions (createServerFn, src/lib/*.functions.ts)
  │
  ├── Lovable AI Gateway ──► Gemini (chat, tutor, exam, career)
  │                        ► OpenAI (embeddings)
  │
  ▼
Lovable Cloud (Supabase)
  ├── Postgres + pgvector (RAG)
  ├── Row-Level Security
  └── Auth (Email + Google)
```

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, TanStack Start, Vite 7, Tailwind CSS v4
- **UI**: shadcn/ui, Radix, Framer Motion, Lucide, Recharts
- **Backend**: Lovable Cloud (Supabase), Postgres, pgvector, RLS
- **AI**: Lovable AI Gateway → Gemini 1.5 Flash + OpenAI embeddings
- **Documents**: pdfjs-dist, mammoth, tesseract.js, jspdf, docx
- **Deployment**: Cloudflare Workers via TanStack Start / Nitro

## 🚀 Setup

```bash
bun install
bun run dev
```

Open http://localhost:8080

## 🔑 Environment Variables

The following are auto-provisioned by Lovable Cloud (do not edit manually):

| Var                             | Purpose               |
| ------------------------------- | --------------------- |
| `VITE_SUPABASE_URL`             | Client Supabase URL   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client Supabase key   |
| `VITE_SUPABASE_PROJECT_ID`      | Project reference     |
| `SUPABASE_URL`                  | Server Supabase URL   |
| `SUPABASE_PUBLISHABLE_KEY`      | Server Supabase key   |
| `LOVABLE_API_KEY`               | AI Gateway key (auto) |

For self-hosted deployments (e.g. Vercel), mirror these in your host's env settings.

## 📚 API Overview

All app-internal logic runs through **server functions** in `src/lib/*.functions.ts`:

| Function        | Purpose                                      |
| --------------- | -------------------------------------------- |
| `aiChat`        | General chat completions                     |
| `aiSummarize`   | Notes → summary + flashcards + quiz          |
| `aiAssignment`  | Assignment / report / PPT generator          |
| `aiPlanner`     | Study plan generator                         |
| `aiTutor`       | Explanations + Mermaid diagrams              |
| `aiExam`        | Adaptive mock exams                          |
| `aiCareer`      | Resume / cover letter / LinkedIn / interview |
| `aiInsights`    | Personalized productivity coaching           |
| `aiIngest`      | Embeddings ingestion for RAG                 |
| `aiSecondBrain` | RAG-grounded Q&A over user data              |

Public routes under `src/routes/api/` (e.g. `/api/transcribe`) handle raw HTTP for audio transcription.

## 📸 Screenshots

Explore the live demo — click **"Try Instant Demo"** on the auth screen to see all features preloaded with realistic sample data.

## 📄 License

MIT © 2026 StudyPilot AI
