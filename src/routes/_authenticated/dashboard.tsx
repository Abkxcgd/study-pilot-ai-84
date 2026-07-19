import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  MessageSquare, FileText, ListChecks, Calendar as CalendarIcon, TrendingUp,
  Layers, BookOpen, Sparkles, Flame,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

  const shortcuts = [
    { to: "/chat", label: "AI Chat", icon: MessageSquare, color: "from-primary/30 to-primary/10" },
    { to: "/notes", label: "Summarize", icon: FileText, color: "from-accent/30 to-accent/10" },
    { to: "/tasks", label: "Tasks", icon: ListChecks, color: "from-success/30 to-success/10" },
    { to: "/flashcards", label: "Flashcards", icon: Layers, color: "from-warning/30 to-warning/10" },
    { to: "/planner", label: "Planner", icon: CalendarIcon, color: "from-primary/30 to-accent/20" },
    { to: "/assignments", label: "Assignments", icon: BookOpen, color: "from-accent/30 to-primary/10" },
  ];

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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="Today's tasks" value={tasks.filter((t: any) => t.status !== "done").length} sub="pending" />
        <StatCard icon={Flame} label="Study streak" value={7} sub="days" accent />
        <StatCard icon={TrendingUp} label="Productivity" value="87%" sub="this week" />
        <StatCard icon={CalendarIcon} label="Upcoming" value={events.length} sub="deadlines" />
      </div>

      {/* Shortcuts */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Quick actions</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {shortcuts.map((s) => (
            <Link key={s.to} to={s.to} className="glass rounded-xl p-4 hover:border-primary/40 transition-colors">
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
            {tasks.map((t: any) => (
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

        {/* Progress */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold">Study progress</h2>
          <div className="mt-4 space-y-4">
            {[
              { name: "Data Structures", pct: 72 },
              { name: "Linear Algebra", pct: 48 },
              { name: "Operating Systems", pct: 91 },
              { name: "English Literature", pct: 33 },
            ].map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1"><span>{s.name}</span><span className="text-muted-foreground">{s.pct}%</span></div>
                <Progress value={s.pct} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Upcoming deadlines</h2>
          <Link to="/calendar" className="text-xs text-muted-foreground hover:text-foreground">Calendar →</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {events.length === 0 && <p className="text-sm text-muted-foreground col-span-full py-6 text-center">Nothing scheduled. Add an event from the calendar.</p>}
          {events.map((e: any) => (
            <div key={e.id} className="glass rounded-xl p-3">
              <div className="text-xs text-accent">{e.event_type}</div>
              <div className="mt-1 font-medium">{e.title}</div>
              <div className="mt-2 text-xs text-muted-foreground">{new Date(e.event_date).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: any; sub: string; accent?: boolean }) {
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
