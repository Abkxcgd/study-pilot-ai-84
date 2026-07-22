import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiRevisionPlan } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles, Download } from "lucide-react";
import { exportPdf } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/revision")({ component: RevisionPage });

type Plan = {
  daily: { date: string; topics: string[]; focusMinutes: number; type: "learn" | "revise" | "test" }[];
  weekly: { week: number; focus: string; milestones: string[] }[];
  monthly: { goal: string; checkpoints: string[] };
  tips: string[];
};

function RevisionPage() {
  const run = useServerFn(aiRevisionPlan);
  const [topics, setTopics] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState(2);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);

  const generate = async () => {
    if (topics.trim().length < 2) return toast.error("Enter topics to revise");
    setLoading(true);
    try {
      const r = (await run({
        data: { topics, examDate: examDate || undefined, hoursPerDay: hours },
      })) as Plan;
      setPlan(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!plan) return;
    const body =
      `Monthly goal: ${plan.monthly.goal}\n\n` +
      plan.daily
        .map(
          (d) =>
            `${d.date} [${d.type.toUpperCase()}] ${d.focusMinutes}min\n  ${d.topics.join(", ")}`,
        )
        .join("\n\n");
    exportPdf("revision-plan", body);
  };

  const typeColor = (t: string) =>
    t === "test"
      ? "bg-warning/15 text-warning border-warning/30"
      : t === "revise"
        ? "bg-primary/15 text-primary-glow border-primary/30"
        : "bg-accent/15 text-accent border-accent/30";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Smart Revision Planner</h1>
          <p className="text-sm text-muted-foreground">
            Spaced repetition schedule with daily, weekly, and monthly views.
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-3">
        <div>
          <Label>Topics to revise</Label>
          <Textarea
            rows={2}
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="e.g. Trees, Graphs, DP, SQL joins, Normalization"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Exam date (optional)</Label>
            <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div>
            <Label>Hours per day</Label>
            <Input
              type="number"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value) || 1)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generate}
            disabled={loading}
            className="bg-gradient-to-r from-primary to-accent"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Plan
          </Button>
          {plan && (
            <Button variant="outline" onClick={download}>
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          )}
        </div>
      </div>

      {plan && (
        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4 grid gap-2 sm:grid-cols-2">
            {plan.daily.map((d, i) => (
              <div key={i} className="glass rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{d.date}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs uppercase ${typeColor(d.type)}`}
                  >
                    {d.type}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{d.focusMinutes} min</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.topics.map((t, j) => (
                    <span
                      key={j}
                      className="rounded-full border border-border/40 px-2 py-0.5 text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="weekly" className="mt-4 space-y-3">
            {plan.weekly.map((w, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold">Week {w.week}</h3>
                  <span className="text-xs text-muted-foreground">{w.focus}</span>
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                  {w.milestones.map((m, j) => (
                    <li key={j}>{m}</li>
                  ))}
                </ul>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="monthly" className="mt-4 space-y-3">
            <div className="glass rounded-2xl p-6">
              <div className="text-xs uppercase text-muted-foreground">Monthly goal</div>
              <div className="mt-1 text-lg font-semibold">{plan.monthly.goal}</div>
              <ul className="mt-3 list-disc pl-5 text-sm space-y-1">
                {plan.monthly.checkpoints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
            {plan.tips.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="font-semibold mb-2">Study tips</h3>
                <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                  {plan.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
