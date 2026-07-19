import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Sparkles, Target, Heart, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — StudyPilot AI" },
      { name: "description", content: "The mission behind StudyPilot AI — helping students study smarter with AI." },
      { property: "og:title", content: "About StudyPilot AI" },
      { property: "og:description", content: "Our mission: give every student a personal AI study companion." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
});

function AboutPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span>StudyPilot <span className="text-gradient">AI</span></span>
          </Link>
          <Link to="/auth"><Button size="sm" className="bg-gradient-to-r from-primary to-accent">Get started</Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/5 px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> About us
          </div>
          <h1 className="mt-6 text-5xl font-bold tracking-tight">Every student deserves an <span className="text-gradient">AI copilot</span>.</h1>
          <p className="mt-6 text-lg text-muted-foreground">
            StudyPilot AI was built by students, for students. We combine the best of generative AI with
            beautiful design to help you learn faster, stay organized, and hit your goals.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Target, title: "Our mission", desc: "Democratize personalized learning through AI." },
            { icon: Heart, title: "Our values", desc: "Simple. Fast. Private. Student-first." },
            { icon: Rocket, title: "Where we're going", desc: "The all-in-one operating system for modern learners." },
          ].map((v) => (
            <div key={v.title} className="glass rounded-2xl p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                <v.icon className="h-5 w-5 text-primary-glow" />
              </div>
              <h3 className="mt-4 font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 glass rounded-3xl p-10 text-center">
          <h2 className="text-3xl font-bold">Built for the AI-native generation.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Chat with an AI tutor, summarize any PDF, generate flashcards, plan your semester, and track
            your progress — all in one workspace crafted like Notion, Linear, and Apple would.
          </p>
          <Link to="/auth" className="mt-8 inline-block">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent glow">Try StudyPilot free</Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div>© 2026 StudyPilot AI</div>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/about" className="hover:text-foreground">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
