import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiExamPredictor } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Target, Sparkles, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/predictor")({ component: PredictorPage });

type Prediction = {
  predictedScore: number;
  confidence: "low" | "medium" | "high";
  weakTopics: { topic: string; reason: string; priority: "high" | "medium" | "low" }[];
  strongTopics: string[];
  recommendations: string[];
  riskLevel: "low" | "medium" | "high";
};

function PredictorPage() {
  const run = useServerFn(aiExamPredictor);
  const [subjects, setSubjects] = useState("");
  const [hours, setHours] = useState(10);
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<{ topic: string; score: string; total: string }[]>([
    { topic: "", score: "", total: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);

  const updateRow = (i: number, k: "topic" | "score" | "total", v: string) => {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)));
  };

  const predict = async () => {
    const recentScores = rows
      .filter((r) => r.topic && r.score && r.total)
      .map((r) => ({ topic: r.topic, score: Number(r.score), total: Number(r.total) }));
    setLoading(true);
    try {
      const r = (await run({
        data: { subjects, recentScores, weeklyStudyHours: hours, daysToExam: days },
      })) as Prediction;
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const riskColor =
    result?.riskLevel === "high"
      ? "text-destructive"
      : result?.riskLevel === "medium"
        ? "text-warning"
        : "text-success";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">AI Exam Predictor</h1>
          <p className="text-sm text-muted-foreground">
            Predict likely performance and pinpoint weak topics before the exam.
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label>Subjects</Label>
            <Input
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="e.g. DSA, DBMS, Operating Systems"
            />
          </div>
          <div>
            <Label>Weekly study hours</Label>
            <Input
              type="number"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>Days to exam</Label>
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Recent quiz results</Label>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input
                  className="col-span-6"
                  placeholder="Topic"
                  value={r.topic}
                  onChange={(e) => updateRow(i, "topic", e.target.value)}
                />
                <Input
                  className="col-span-3"
                  placeholder="Score"
                  type="number"
                  value={r.score}
                  onChange={(e) => updateRow(i, "score", e.target.value)}
                />
                <Input
                  className="col-span-3"
                  placeholder="Total"
                  type="number"
                  value={r.total}
                  onChange={(e) => updateRow(i, "total", e.target.value)}
                />
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRows((r) => [...r, { topic: "", score: "", total: "" }])}
            >
              + Add row
            </Button>
          </div>
        </div>

        <Button
          onClick={predict}
          disabled={loading}
          className="bg-gradient-to-r from-primary to-accent"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Predict Performance
        </Button>
      </div>

      {result && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass rounded-2xl p-6">
            <div className="text-xs uppercase text-muted-foreground">Predicted score</div>
            <div className="mt-1 text-5xl font-bold text-gradient">{result.predictedScore}</div>
            <Progress value={result.predictedScore} className="mt-3" />
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                Confidence: <span className="font-medium">{result.confidence}</span>
              </span>
              <span className={`inline-flex items-center gap-1 font-medium ${riskColor}`}>
                <AlertTriangle className="h-3 w-3" /> {result.riskLevel} risk
              </span>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingDown className="h-4 w-4 text-warning" /> Weak topics
            </h3>
            <ul className="space-y-2">
              {result.weakTopics.map((w, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{w.topic}</span>
                    <span
                      className={`text-xs uppercase ${w.priority === "high" ? "text-destructive" : w.priority === "medium" ? "text-warning" : "text-muted-foreground"}`}
                    >
                      {w.priority}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{w.reason}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4 text-success" /> Strong topics
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {result.strongTopics.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="mb-3 font-semibold">Recommendations</h3>
            <ul className="space-y-2 text-sm">
              {result.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
