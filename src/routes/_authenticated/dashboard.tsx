import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  MessageSquare, FileText, ListChecks, Calendar as CalendarIcon, TrendingUp,
  Layers, BookOpen, Sparkles, Flame, Trophy, Zap, Award, Timer, Mic,
  GraduationCap, Briefcase, Lightbulb, Brain,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BADGE_LABELS } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user } = Route.useRouteContext();
  const name = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "there";

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-preview"],
    queryFn: async () => (await supabase.from("tasks").select("*").order("due_date", { ascending: true }).limit(5)).data ?? [],
  });
  const { data: events = [] } = useQuery({
    queryKey: ["events-preview"],
    queryFn: async () => (await supabase.from("events").select("*").gte("event_date", new Date().toISOString()).order("event_date").limit(4)).data ?? [],
  });
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => (await supabase.from("user_stats").select("*").maybeSingle()).data,
  });
  const { data: badges = [] } = useQuery({
    queryKey: ["badges"],
    queryFn: async () => (await supabase.from("user_badges").select("badge_key").order("earned_at", { ascending: false })).data ?? [],
  });

  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const streak = stats?.current_streak ?? 0;
  const xpInLevel = xp % 100;

  const nextExam = events.find((e) => e.event_type === "exam");
  const daysToExam = nextExam ? Math.max(0, Math.ceil((new Date(nextExam.event_date).getTime() - Date.now()) / 86400000)) : null;

  const shortcuts = [
    { to: "/tutor", label: "AI Tutor", icon: Lightbulb, color: "from-primary/30 to-primary/10" },
    { to: "/exam", label: "Exam Mode", icon: GraduationCap, color: "from-accent/30 to-accent/10" },
    { to: "/career", label: "Career", icon: Briefcase, color: "from-pink-500/30 to-pink-500/10" },
    { to: "/insights", label: "Insights", icon: Sparkles, color: "from-orange-500/30 to-orange-500/10" },
    { to: "/brain", label: "Second Brain", icon: Brain, color: "from-primary/30 to-accent/20" },
    { to: "/chat", label: "AI Chat", icon: MessageSquare, color: "from-primary/30 to-primary/10" },
    { to: "/notes", label: "Summarize", icon: FileText, color: "from-accent/30 to-accent/10" },
    { to: "/voice-notes", label: "Voice Notes", icon: Mic, color: "from-pink-500/30 to-pink-500/10" },
    { to: "/focus", label: "Focus Timer", icon: Timer, color: "from-orange-500/30 to-orange-500/10" },
    { to: "/tasks", label: "Tasks", icon: ListChecks, color: "from-success/30 to-success/10" },
    { to: "/flashcards", label: "Flashcards", icon: Layers, color: "from-warning/30 to-warning/10" },
    { to: "/assignments", label: "Assignments", icon: BookOpen, color: "from-accent/30 to-primary/10" },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Welcome back, <span className="text-gradient">{name}</span> 👋</h1>
            <p className="mt-1 text-muted-foreground">Here's your study command center for today.</p>
          </div>
          <Link to="/chat" className="glass rounded-xl px-4 py-2 text-sm flex items-center gap-2 hover:border-primary/40">
            <Sparkles className="h-4 w-4 text-primary-glow" /> Ask StudyPilot AI
          </Link>
        </div>
      </motion.div>

      {/* Gamification hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="grid gap-6 md:grid-cols-4 relative">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <Zap className="h-3 w-3" /> Level {level}
            </div>
            <div className="text-4xl font-bold">
              <span className="text-gradient">{xp}</span> <span className="text-lg text-muted-foreground">XP</span>
            </div>
            <Progress value={xpInLevel} />
            <div className="text-xs text-muted-foreground">{100 - xpInLevel} XP to level {level + 1}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-orange-500/30 to-red-500/10">
              <Flame className="h-7 w-7 text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{streak}</div>
              <div className="text-xs text-muted-foreground">day streak</div>
            </div>
          </div>
          <Link to="/leaderboard" className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-warning/30 to-warning/10">
              <Trophy className="h-7 w-7 text-warning" />
            </div>
            <div>
              <div className="text-2xl font-bold">{badges.length}</div>
              <div className="text-xs text-muted-foreground">badges earned</div>
            </div>
          </Link>
        </div>
        {badges.length > 0 && (
          <div className="relative mt-5 flex flex-wrap gap-2">
            {badges.slice(0, 6).map((b) => (
              <span key={b.badge_key} className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/5 px-3 py-1 text-xs">
                <Award className="h-3 w-3 text-warning" /> {BADGE_LABELS[b.badge_key] ?? b.badge_key}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="Today's tasks" value={tasks.filter((t) => t.status !== "done").length} sub="pending" />
        <StatCard icon={Flame} label="Study streak" value={streak} sub="days" accent />
        <StatCard icon={TrendingUp} label="Level" value={level} sub={`${xp} XP total`} />
        <StatCard icon={CalendarIcon} label="Upcoming" value={events.length} sub="deadlines" />
      </div>

      {/* Shortcuts */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Quick actions</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {shortcuts.map((s) => (
            <Link key={s.to} to={s.to} className="glass hover-lift rounded-xl p-4 hover:border-primary/40">
              <div className={`grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-medium">{s.label}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Today's tasks</h2>
            <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="mt-4 space-y-2">
            {tasks.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No tasks yet. Create one from the To-Do board.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-white/5 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.priority} · {t.status}</div>
                </div>
                {t.due_date && <div className="text-xs text-muted-foreground">{new Date(t.due_date).toLocaleDateString()}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Upcoming deadlines</h2>
            <Link to="/calendar" className="text-xs text-muted-foreground hover:text-foreground">Calendar →</Link>
          </div>
          <div className="mt-4 space-y-3">
            {events.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nothing scheduled. Add an event from the calendar.</p>}
            {events.map((e) => (
              <div key={e.id} className="glass rounded-xl p-3">
                <div className="text-xs text-accent">{e.event_type}</div>
                <div className="mt-1 font-medium">{e.title}</div>
                <div className="mt-2 text-xs text-muted-foreground">{new Date(e.event_date).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; sub: string; accent?: boolean }) {
  return (
    <div className={`glass rounded-2xl p-5 ${accent ? "glow" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
