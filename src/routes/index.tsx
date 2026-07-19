import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles,
  Brain,
  FileText,
  Calendar,
  ListChecks,
  MessageSquare,
  BarChart3,
  Zap,
  Check,
  ArrowRight,
  GraduationCap,
  Layers,
  BookOpen,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({ component: Landing });

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    desc: "Ask anything — DSA, math, essays, coding doubts. Instant expert answers.",
  },
  {
    icon: FileText,
    title: "Notes Summarizer",
    desc: "Paste any material → summary, key points, flashcards, quiz.",
  },
  {
    icon: BookOpen,
    title: "Assignment Generator",
    desc: "Reports, PPT outlines, research notes, code — export ready.",
  },
  {
    icon: Calendar,
    title: "AI Study Planner",
    desc: "Smart weekly timetable based on your subjects and exam date.",
  },
  {
    icon: ListChecks,
    title: "Smart To-Do",
    desc: "Priorities, deadlines, drag & drop kanban, notifications.",
  },
  {
    icon: Layers,
    title: "Flashcards",
    desc: "Auto-generated from any topic. Quiz mode with instant scoring.",
  },
  {
    icon: BarChart3,
    title: "Productivity Analytics",
    desc: "Track hours, tasks done, streaks, and your productivity score.",
  },
  { icon: Brain, title: "PDF Chat", desc: "Ask questions about any document you paste in." },
];

const testimonials = [
  {
    name: "Aarav S.",
    role: "CS Undergrad",
    quote: "StudyPilot summarized my 80-page lecture pack in seconds. Grades up, stress down.",
  },
  {
    name: "Meera K.",
    role: "Med Student",
    quote: "The flashcards + quiz combo is unreal. Feels like a personal tutor.",
  },
  {
    name: "Jonas W.",
    role: "MBA",
    quote: "I run my whole semester from the dashboard. It's Notion + ChatGPT, but for studying.",
  },
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    features: ["10 AI chats/day", "5 note summaries/mo", "Basic planner", "Community support"],
    cta: "Get started",
  },
  {
    name: "Pro",
    price: "$9",
    highlight: true,
    features: [
      "Unlimited AI chats",
      "Unlimited summaries",
      "Advanced analytics",
      "Flashcards + Quiz",
      "Priority support",
    ],
    cta: "Go Pro",
  },
  {
    name: "Team",
    price: "$19",
    features: ["Everything in Pro", "Shared study rooms", "Group planning", "Admin controls"],
    cta: "Contact us",
  },
];

const faqs = [
  {
    q: "Is StudyPilot AI free?",
    a: "Yes — the Free plan gives you generous daily limits. Upgrade only when you need more.",
  },
  {
    q: "Which AI powers it?",
    a: "We use state-of-the-art Gemini models via Lovable AI Gateway for fast, accurate responses.",
  },
  {
    q: "Can I upload PDFs?",
    a: "Paste any text — PDF/DOCX text extraction is supported in the summarizer and PDF chat.",
  },
  {
    q: "Is my data private?",
    a: "Absolutely. Your notes and chats are stored securely and only visible to you.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg">
              StudyPilot <span className="text-gradient">AI</span>
            </span>
          </Link>
          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <a href="#contact" className="hover:text-foreground">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 pt-16 pb-24 lg:grid-cols-2 lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-white/5 px-3 py-1 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Powered by Gemini
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Study Smarter.
              <br />
              <span className="text-gradient">Learn Faster.</span>
              <br />
              Achieve More.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              The all-in-one AI productivity assistant for students. Summarize notes, generate
              assignments, plan study sessions, and organize your entire academic life —
              beautifully.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent glow">
                  Start free <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">
                  Explore features
                </Button>
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" /> No credit card
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" /> Free forever plan
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <div className="glass overflow-hidden rounded-3xl">
              <img src={hero} alt="StudyPilot AI dashboard preview" className="w-full" />
            </div>
            <div className="absolute -bottom-6 -left-6 glass rounded-2xl p-4 hidden sm:block">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/20">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Productivity</div>
                  <div className="font-semibold">+87% this week</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold sm:text-5xl">Everything a student needs.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Ten AI-powered tools in one clean workspace.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-6 hover:border-primary/40 transition-colors"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                <f.icon className="h-5 w-5 text-primary-glow" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-center text-4xl font-bold">Loved by students worldwide</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="glass rounded-2xl p-6">
              <p className="text-sm leading-relaxed">"{t.quote}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-accent font-semibold">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-4xl font-bold">Simple, honest pricing</h2>
          <p className="mt-3 text-muted-foreground">Start free. Upgrade when you need more.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {pricing.map((p) => (
            <div
              key={p.name}
              className={`glass rounded-2xl p-8 ${p.highlight ? "border-primary/60 glow" : ""}`}
            >
              {p.highlight && (
                <div className="mb-4 inline-block rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1 text-xs font-semibold">
                  Most popular
                </div>
              )}
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="mt-2 text-4xl font-bold">
                {p.price}
                <span className="text-base text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((ft) => (
                  <li key={ft} className="flex gap-2">
                    <Check className="h-4 w-4 text-success mt-0.5" />
                    {ft}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="mt-6 block">
                <Button
                  className={`w-full ${p.highlight ? "bg-gradient-to-r from-primary to-accent" : ""}`}
                  variant={p.highlight ? "default" : "outline"}
                >
                  {p.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-center text-4xl font-bold">Frequently asked</h2>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="glass mb-3 rounded-xl border-none px-5"
            >
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section id="contact" className="mx-auto max-w-5xl px-6 py-24">
        <div className="glass rounded-3xl p-12 text-center glow">
          <Rocket className="mx-auto h-10 w-10 text-primary-glow" />
          <h2 className="mt-4 text-4xl font-bold">Ready to fly through this semester?</h2>
          <p className="mt-3 text-muted-foreground">
            Join thousands of students studying smarter with StudyPilot AI.
          </p>
          <Link to="/auth" className="mt-8 inline-block">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent glow">
              Start free — no card needed
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div>© 2026 StudyPilot AI. All rights reserved.</div>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/about" className="hover:text-foreground">
              About
            </Link>
            <a href="#contact" className="hover:text-foreground">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
