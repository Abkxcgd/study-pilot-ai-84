import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — StudyPilot AI" },
      { name: "description", content: "Terms that govern your use of StudyPilot AI." },
      { property: "og:title", content: "Terms of Service — StudyPilot AI" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
});

function TermsPage() {
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
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: July 19, 2026</p>

        <h2>1. Acceptance</h2>
        <p>By creating an account or using StudyPilot AI, you agree to these terms.</p>

        <h2>2. Your account</h2>
        <p>
          You are responsible for keeping your credentials safe and for the activity that happens
          under your account. You must be at least 13 years old to use the service.
        </p>

        <h2>3. Acceptable use</h2>
        <ul>
          <li>Don't submit content that is illegal, harmful, or infringes on others' rights.</li>
          <li>Don't attempt to reverse engineer, disrupt, or overload the service.</li>
          <li>
            Don't use the AI features to generate content that violates academic integrity policies
            at your institution.
          </li>
        </ul>

        <h2>4. AI-generated content</h2>
        <p>
          AI outputs may contain inaccuracies. You are responsible for reviewing and verifying
          AI-generated content before relying on it for exams, submissions, or decisions.
        </p>

        <h2>5. Subscriptions</h2>
        <p>
          Free plans have usage limits. Paid plans, when available, are billed as described at
          checkout and are non-refundable except where required by law.
        </p>

        <h2>6. Termination</h2>
        <p>
          You may delete your account at any time. We may suspend accounts that violate these terms.
        </p>

        <h2>7. Disclaimer</h2>
        <p>
          The service is provided "as is" without warranties of any kind. To the maximum extent
          permitted by law, we are not liable for indirect or consequential damages.
        </p>

        <h2>8. Contact</h2>
        <p>
          For questions about these terms, email{" "}
          <a href="mailto:hello@studypilot.ai" className="text-primary-glow">
            hello@studypilot.ai
          </a>
          .
        </p>
      </main>
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <div>© 2026 StudyPilot AI</div>
          <div className="flex gap-6">
            <Link to="/privacy">Privacy</Link>
            <Link to="/about">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
