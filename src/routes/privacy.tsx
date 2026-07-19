import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — StudyPilot AI" },
      { name: "description", content: "How StudyPilot AI collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy Policy — StudyPilot AI" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span>
              StudyPilot <span className="text-gradient">AI</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 prose prose-invert prose-headings:text-foreground">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: July 19, 2026</p>

        <p>
          StudyPilot AI ("we", "our") is maintained by the StudyPilot AI team to answer common
          privacy questions about how the app handles your data. This page describes practices that
          are visible in the app today.
        </p>

        <h2>1. Information we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong>: email address and optional profile name when you sign up.
          </li>
          <li>
            <strong>Study content</strong>: notes, tasks, events, flashcards, and documents you
            create or upload.
          </li>
          <li>
            <strong>Usage data</strong>: basic activity such as study streaks, XP, and feature usage
            to power analytics inside your account.
          </li>
        </ul>

        <h2>2. How we use your data</h2>
        <ul>
          <li>To provide the AI features you request (chat, summaries, exam mode, tutoring).</li>
          <li>To display your dashboard, analytics, and gamification progress.</li>
          <li>To secure your account and prevent abuse.</li>
        </ul>

        <h2>3. AI processing</h2>
        <p>
          When you use AI features, the relevant prompt or document text is sent to our AI provider
          through a secure gateway to generate a response. We do not train foundation models on your
          private content.
        </p>

        <h2>4. Storage & security</h2>
        <p>
          Your data is stored in a managed database with row-level security so only you can access
          your rows. Traffic is encrypted in transit.
        </p>

        <h2>5. Your rights</h2>
        <p>
          You can delete your data at any time from Settings. To request full account deletion,
          contact us at the email below.
        </p>

        <h2>6. Contact</h2>
        <p>
          Questions? Reach out at{" "}
          <a href="mailto:hello@studypilot.ai" className="text-primary-glow">
            hello@studypilot.ai
          </a>
          .
        </p>

        <p className="text-sm text-muted-foreground">
          This page is app-owned content and is not a legal opinion or independent certification.
        </p>
      </main>
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <div>© 2026 StudyPilot AI</div>
          <div className="flex gap-6">
            <Link to="/terms">Terms</Link>
            <Link to="/about">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
