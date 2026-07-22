import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { BarChart3, TrendingUp, Clock, Target, Zap, Flame, CalendarDays } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { StudyHeatmap } from "@/components/StudyHeatmap";

export const Route = createFileRoute("/_authenticated/analytics")({ component: Page });

const COLORS = ["#4F46E5", "#06B6D4", "#22C55E", "#F59E0B", "#EC4899"];

function Page() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const since = subDays(new Date(), 6).toISOString();
      const since90 = subDays(new Date(), 90).toISOString();
      const [sessions, sessions90, tasks, notes, messages, stats] = await Promise.all([
        supabase
          .from("focus_sessions")
          .select("duration_minutes, completed_at")
          .gte("completed_at", since),
        supabase
          .from("focus_sessions")
          .select("duration_minutes, completed_at")
          .gte("completed_at", since90),
        supabase.from("tasks").select("status, updated_at").gte("updated_at", since),
        supabase.from("notes").select("created_at").gte("created_at", since),
        supabase.from("chat_messages").select("id, created_at").gte("created_at", since),
        supabase.from("user_stats").select("*").maybeSingle(),
      ]);
      return {
        sessions: sessions.data ?? [],
        sessions90: sessions90.data ?? [],
        tasks: tasks.data ?? [],
        notes: notes.data ?? [],
        messages: messages.data ?? [],
        stats: stats.data,
      };
    },
  });

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    return { key: startOfDay(d).toISOString().slice(0, 10), label: format(d, "EEE") };
  });

  const hours = days.map((d) => ({
    day: d.label,
    h: (
      (data?.sessions ?? [])
        .filter((s) => s.completed_at.startsWith(d.key))
        .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60
    ).toFixed(1),
  }));
  const tasksDone = days.map((d) => ({
    day: d.label,
    done: (data?.tasks ?? []).filter((t) => t.status === "done" && t.updated_at.startsWith(d.key))
      .length,
  }));

  const totalHours = hours.reduce((s, h) => s + parseFloat(h.h), 0).toFixed(1);
  const totalTasks = tasksDone.reduce((s, t) => s + t.done, 0);
  const totalAi = data?.messages.length ?? 0;

  const usage = [
    { name: "AI Chat", value: totalAi },
    { name: "Notes", value: data?.notes.length ?? 0 },
    { name: "Focus", value: data?.sessions.length ?? 0 },
    { name: "Tasks", value: totalTasks },
  ].filter((u) => u.value > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary-glow" /> Productivity Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Real insights from your last 7 days of study.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Clock} label="Focus hours" value={totalHours} sub="past 7 days" />
        <Stat icon={Target} label="Tasks done" value={totalTasks} sub="past 7 days" />
        <Stat icon={Zap} label="AI messages" value={totalAi} sub="past 7 days" />
        <Stat
          icon={Flame}
          label="Streak"
          value={data?.stats?.current_streak ?? 0}
          sub={`Level ${data?.stats?.level ?? 1}`}
          accent
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Focus hours (last 7 days)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hours}>
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "rgba(20,25,40,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="h" fill="url(#g1)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Tasks completed</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tasksDone}>
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "rgba(20,25,40,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="done"
                stroke="#06B6D4"
                strokeWidth={3}
                dot={{ fill: "#06B6D4", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4">Activity breakdown</h2>
          {usage.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No activity yet. Start studying to see your breakdown.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={usage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label
                >
                  {usage.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,25,40,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={`glass rounded-2xl p-5 ${accent ? "glow" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
        <TrendingUp className="h-3 w-3" />
        {sub}
      </div>
    </div>
  );
}
