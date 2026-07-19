import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiInsights } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Lightbulb, AlertTriangle, TrendingDown, Target, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/insights")({ component: InsightsPage });

type Insights = {
  recommendations: string[];
  atRiskDeadlines: string[];
  weakSubjects: string[];
  dailyGoal: string;
  motivationalNote: string;
};

function InsightsPage() {
  const run = useServerFn(aiInsights);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Insights | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes, statsRes, notesRes, focusRes] = await Promise.all([
        supabase.from("tasks").select("title,status,priority,due_date").order("due_date").limit(30),
        supabase
          .from("events")
          .select("title,event_type,event_date")
          .gte("event_date", new Date().toISOString())
          .order("event_date")
          .limit(20),
        supabase.from("user_stats").select("xp,level,current_streak").maybeSingle(),
        supabase.from("notes").select("id", { count: "exact", head: true }),
        supabase
          .from("focus_sessions")
          .select("duration_minutes")
          .gte("completed_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      const focusMinutes = (focusRes.data ?? []).reduce((s, f) => s + (f.duration_minutes || 0), 0);
      const res = await run({
        data: {
          tasks: tasksRes.data ?? [],
          events: eventsRes.data ?? [],
          stats: statsRes.data ?? undefined,
          focusMinutes,
          notesCount: notesRes.count ?? 0,
        },
      });
      setData(res as Insights);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">AI Insights</h1>
            <p className="text-sm text-muted-foreground">
              Personalized productivity coaching based on your real activity.
            </p>
          </div>
        </div>
        <Button
          onClick={generate}
          disabled={loading}
          className="bg-gradient-to-r from-primary to-accent"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}{" "}
          Generate Insights
        </Button>
      </div>

      {!data && !loading && (
        <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
          Click "Generate Insights" to analyze your recent study data.
        </div>
      )}

      {data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-2"
        >
          <div className="glass rounded-2xl p-6 md:col-span-2">
            <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" /> Today's goal
            </div>
            <div className="mt-2 text-xl font-semibold text-gradient">{data.dailyGoal}</div>
            {data.motivationalNote && (
              <p className="mt-3 text-sm text-muted-foreground italic">"{data.motivationalNote}"</p>
            )}
          </div>

          <Card
            icon={Lightbulb}
            title="Recommendations"
            items={data.recommendations}
            tone="primary"
          />
          <Card
            icon={AlertTriangle}
            title="At-risk deadlines"
            items={data.atRiskDeadlines}
            tone="warning"
          />
          <Card
            icon={TrendingDown}
            title="Weak subjects"
            items={data.weakSubjects}
            tone="destructive"
          />
        </motion.div>
      )}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  tone: "primary" | "warning" | "destructive";
}) {
  const color = {
    primary: "text-primary-glow",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];
  return (
    <div className="glass rounded-2xl p-6">
      <div className={`flex items-center gap-2 ${color}`}>
        <Icon className="h-4 w-4" /> <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {items?.length ? (
        <ul className="mt-4 space-y-2">
          {items.map((i, k) => (
            <li key={k} className="text-sm flex gap-2">
              <span
                className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${tone === "primary" ? "bg-primary" : tone === "warning" ? "bg-warning" : "bg-destructive"}`}
              />{" "}
              {i}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Nothing flagged — you're on track. 🎯</p>
      )}
    </div>
  );
}
