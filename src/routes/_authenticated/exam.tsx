import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiExam } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, GraduationCap, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { awardXp } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/exam")({ component: ExamPage });

type Q = { topic: string; question: string; options: string[]; answerIndex: number; explanation: string };

function ExamPage() {
  const run = useServerFn(aiExam);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(8);
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const start = async () => {
    if (!topic.trim()) return toast.error("Enter a topic");
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    try {
      const res = await run({ data: { topic, difficulty, count, sourceText: sourceText || undefined } });
      setQuestions(res.questions ?? []);
      if ((res.questions ?? []).length === 0) toast.error("No questions generated. Try again.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate exam");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setSubmitted(true);
    const correct = questions.reduce((n, q, i) => n + (answers[i] === q.answerIndex ? 1 : 0), 0);
    await awardXp(Math.max(10, correct * 5));
    toast.success(`Scored ${correct}/${questions.length}. +${Math.max(10, correct * 5)} XP`);
  };

  const correctCount = submitted ? questions.reduce((n, q, i) => n + (answers[i] === q.answerIndex ? 1 : 0), 0) : 0;
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;

  // Weak topics: those where user got it wrong
  const weakTopics = submitted
    ? Array.from(new Set(questions.filter((q, i) => answers[i] !== q.answerIndex).map((q) => q.topic)))
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">AI Exam Mode</h1>
          <p className="text-sm text-muted-foreground">Adaptive mock tests with instant scoring & weak-topic detection.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2"><Label>Topic</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Machine Learning basics" /></div>
          <div>
            <Label>Difficulty</Label>
            <div className="mt-2 flex gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 rounded-md px-2 py-1.5 text-xs capitalize transition ${difficulty === d ? "bg-gradient-to-r from-primary to-accent text-white" : "border border-border/50 text-muted-foreground hover:text-foreground"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Questions</Label>
            <Input type="number" min={3} max={20} value={count} onChange={(e) => setCount(parseInt(e.target.value) || 8)} />
          </div>
          <div className="sm:col-span-3">
            <Label>Optional source material (paste notes)</Label>
            <Textarea rows={4} value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste notes to base questions on your material..." />
          </div>
        </div>
        <Button onClick={start} disabled={loading} className="bg-gradient-to-r from-primary to-accent">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate Exam
        </Button>
      </div>

      {questions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {submitted && (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">Your score</h2>
                <div className="text-3xl font-bold text-gradient">{score}%</div>
              </div>
              <Progress value={score} className="mt-3" />
              <div className="mt-3 text-sm text-muted-foreground">{correctCount} of {questions.length} correct</div>
              {weakTopics.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Focus areas</div>
                  <div className="flex flex-wrap gap-2">
                    {weakTopics.map((t) => (
                      <span key={t} className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {questions.map((q, i) => {
            const user = answers[i];
            const isCorrect = submitted && user === q.answerIndex;
            return (
              <div key={i} className="glass rounded-2xl p-6">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Q{i + 1} · {q.topic}</div>
                <div className="mt-1 font-medium">{q.question}</div>
                <div className="mt-4 space-y-2">
                  {q.options.map((opt, j) => {
                    const chosen = user === j;
                    const correct = submitted && j === q.answerIndex;
                    const wrong = submitted && chosen && j !== q.answerIndex;
                    return (
                      <button
                        key={j}
                        disabled={submitted}
                        onClick={() => setAnswers({ ...answers, [i]: j })}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition ${
                          correct ? "border-success/60 bg-success/10" :
                          wrong ? "border-destructive/60 bg-destructive/10" :
                          chosen ? "border-primary/50 bg-primary/10" :
                          "border-border/40 hover:border-primary/30 hover:bg-white/5"
                        }`}
                      >
                        <span className="mr-2 font-medium">{String.fromCharCode(65 + j)}.</span>{opt}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <div className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {isCorrect ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <XCircle className="h-4 w-4 mt-0.5" />}
                    <div><span className="font-medium">{isCorrect ? "Correct." : "Not quite."}</span> {q.explanation}</div>
                  </div>
                )}
              </div>
            );
          })}

          {!submitted && (
            <Button onClick={submit} className="w-full bg-gradient-to-r from-primary to-accent" disabled={Object.keys(answers).length < questions.length}>
              Submit Exam ({Object.keys(answers).length}/{questions.length} answered)
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
