import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiPlanner } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarClock, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/planner")({ component: Page });

type Plan = { weekly: { day: string; blocks: { time: string; subject: string; goal: string }[] }[]; dailyGoals: string[]; tips: string[] };

function Page() {
  const planner = useServerFn(aiPlanner);
  const [subjects, setSubjects] = useState("Data Structures, Calculus, English");
  const [examDate, setExamDate] = useState("");
  const [dailyHours, setDailyHours] = useState(4);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!subjects.trim()) return;
    setLoading(true);
    try {
      const r = await planner({ data: { subjects, examDate: examDate || undefined, dailyHours } });
      setPlan(r as Plan);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><CalendarClock className="h-7 w-7 text-primary-glow" /> AI Study Planner</h1>
        <p className="text-muted-foreground mt-1">Generate a smart weekly timetable tailored to your goals.</p>
      </div>

      <div className="glass rounded-2xl p-6 grid gap-4 md:grid-cols-3">
        <div><Label>Subjects (comma separated)</Label><Input value={subjects} onChange={(e) => setSubjects(e.target.value)} /></div>
        <div><Label>Exam date</Label><Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></div>
        <div><Label>Daily study hours</Label><Input type="number" min={1} max={16} value={dailyHours} onChange={(e) => setDailyHours(+e.target.value)} /></div>
        <div className="md:col-span-3">
          <Button onClick={run} disabled={loading} className="bg-gradient-to-r from-primary to-accent">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate my plan
          </Button>
        </div>
      </div>

      {plan && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {plan.dailyGoals?.map((g, i) => (
              <div key={i} className="glass rounded-xl p-4">
                <div className="text-xs text-accent">Daily goal {i + 1}</div>
                <div className="mt-1 text-sm">{g}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plan.weekly?.map((d) => (
              <div key={d.day} className="glass rounded-2xl p-5">
                <h3 className="font-semibold text-gradient">{d.day}</h3>
                <div className="mt-3 space-y-2">
                  {d.blocks?.map((b, i) => (
                    <div key={i} className="rounded-lg border border-border/40 bg-white/5 p-3">
                      <div className="text-xs text-muted-foreground">{b.time}</div>
                      <div className="text-sm font-medium">{b.subject}</div>
                      <div className="text-xs text-muted-foreground">{b.goal}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {plan.tips?.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold">Pro tips</h3>
              <ul className="mt-3 space-y-1 text-sm list-disc pl-5">
                {plan.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
