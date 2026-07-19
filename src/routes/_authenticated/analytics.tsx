import { createFileRoute } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { BarChart3, TrendingUp, Clock, Target, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({ component: Page });

const hours = [
  { day: "Mon", h: 3.2 }, { day: "Tue", h: 4.1 }, { day: "Wed", h: 2.8 },
  { day: "Thu", h: 5.0 }, { day: "Fri", h: 3.9 }, { day: "Sat", h: 6.2 }, { day: "Sun", h: 4.5 },
];
const tasks = [
  { day: "Mon", done: 4 }, { day: "Tue", done: 6 }, { day: "Wed", done: 3 },
  { day: "Thu", done: 8 }, { day: "Fri", done: 5 }, { day: "Sat", done: 9 }, { day: "Sun", done: 7 },
];
const usage = [
  { name: "AI Chat", value: 42 }, { name: "Notes", value: 25 }, { name: "Flashcards", value: 18 },
  { name: "Planner", value: 10 }, { name: "PDF Chat", value: 5 },
];
const COLORS = ["#4F46E5", "#06B6D4", "#22C55E", "#F59E0B", "#EC4899"];

function Page() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><BarChart3 className="h-7 w-7 text-primary-glow" /> Productivity Analytics</h1>
        <p className="text-muted-foreground mt-1">Insights into how you study.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Clock} label="Study hours" value="29.7" sub="this week" />
        <Stat icon={Target} label="Tasks done" value="42" sub="this week" />
        <Stat icon={Zap} label="AI queries" value="187" sub="this week" />
        <Stat icon={TrendingUp} label="Productivity" value="87%" sub="+12% vs last" accent />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Study hours</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hours}>
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: "rgba(20,25,40,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              <Bar dataKey="h" fill="url(#g1)" radius={[8, 8, 0, 0]} />
              <defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4F46E5" /><stop offset="100%" stopColor="#06B6D4" /></linearGradient></defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Tasks completed</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tasks}>
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: "rgba(20,25,40,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="done" stroke="#06B6D4" strokeWidth={3} dot={{ fill: "#06B6D4", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4">AI feature usage</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={usage} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                {usage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: "rgba(20,25,40,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, accent }: any) {
  return (
    <div className={`glass rounded-2xl p-5 ${accent ? "glow" : ""}`}>
      <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">{label}</div><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
