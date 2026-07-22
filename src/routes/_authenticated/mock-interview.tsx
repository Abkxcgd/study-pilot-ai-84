import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiMockInterview } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Mic,
  Square,
  Sparkles,
  Volume2,
  Play,
  ArrowRight,
  MessageSquareQuote,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/mock-interview")({
  component: MockInterviewPage,
});

type Feedback = {
  perQuestion: { score: number; feedback: string }[];
  overallScore: number;
  strengths: string[];
  improvements: string[];
  verdict: string;
};

type SpeechRecognitionResultLike = { transcript: string };

// Minimal typing shim for browser SpeechRecognition
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function MockInterviewPage() {
  const run = useServerFn(aiMockInterview);
  const [role, setRole] = useState("Frontend Engineer Intern");
  const [type, setType] = useState<"hr" | "technical" | "mixed">("mixed");
  const [phase, setPhase] = useState<"setup" | "interview" | "done">("setup");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      recRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  };

  const start = async () => {
    if (role.trim().length < 2) return toast.error("Enter a role");
    setLoading(true);
    try {
      const r = (await run({ data: { action: "start", role, type, count: 6 } })) as {
        questions: string[];
      };
      if (!r.questions?.length) return toast.error("Couldn't generate questions");
      setQuestions(r.questions);
      setAnswers(new Array(r.questions.length).fill(""));
      setCurrent(0);
      setDraft("");
      setFeedback(null);
      setPhase("interview");
      setTimeout(() => speak(r.questions[0]), 200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleRecord = () => {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) return toast.error("Voice input not supported in this browser. Use Chrome or Edge.");
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = draft ? draft + " " : "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0].transcript;
        if ((res as unknown as { isFinal: boolean }).isFinal) finalText += t + " ";
        else interim += t;
      }
      setDraft((finalText + interim).trim());
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    recRef.current = rec;
    setRecording(true);
    try {
      rec.start();
    } catch {
      setRecording(false);
    }
  };

  const next = () => {
    const nextAnswers = [...answers];
    nextAnswers[current] = draft;
    setAnswers(nextAnswers);
    recRef.current?.stop();
    if (current + 1 < questions.length) {
      const idx = current + 1;
      setCurrent(idx);
      setDraft("");
      setTimeout(() => speak(questions[idx]), 100);
    } else {
      finish(nextAnswers);
    }
  };

  const finish = async (finalAnswers: string[]) => {
    setLoading(true);
    try {
      const qa = questions.map((q, i) => ({ question: q, answer: finalAnswers[i] ?? "" }));
      const r = (await run({ data: { action: "feedback", role, type, qa } })) as Feedback;
      setFeedback(r);
      setPhase("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    recRef.current?.stop();
    window.speechSynthesis?.cancel();
    setPhase("setup");
    setQuestions([]);
    setAnswers([]);
    setFeedback(null);
    setDraft("");
    setCurrent(0);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <MessageSquareQuote className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">AI Mock Interview</h1>
          <p className="text-sm text-muted-foreground">
            Voice-based practice with AI feedback and scoring.
          </p>
        </div>
      </div>

      {phase === "setup" && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div>
            <Label>Role</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div>
            <Label className="mb-2 block">Interview type</Label>
            <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
              <TabsList>
                <TabsTrigger value="hr">HR</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="mixed">Mixed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Button
            onClick={start}
            disabled={loading}
            className="bg-gradient-to-r from-primary to-accent"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Start Interview
          </Button>
        </div>
      )}

      {phase === "interview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question {current + 1} of {questions.length}
            </span>
            <Button size="sm" variant="ghost" onClick={() => speak(questions[current])}>
              <Volume2 className="mr-1 h-3 w-3" /> Replay
            </Button>
          </div>
          <Progress value={((current + 1) / questions.length) * 100} />

          <div className="glass rounded-2xl p-6">
            <div className="text-xs uppercase text-primary-glow mb-1">Interviewer</div>
            <p className="text-lg font-medium">{questions[current]}</p>
          </div>

          <div className="glass rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase text-muted-foreground">Your answer</div>
              <Button
                size="sm"
                variant={recording ? "destructive" : "outline"}
                onClick={toggleRecord}
              >
                {recording ? (
                  <>
                    <Square className="mr-1 h-3 w-3" /> Stop
                  </>
                ) : (
                  <>
                    <Mic className="mr-1 h-3 w-3" /> Record
                  </>
                )}
              </Button>
            </div>
            <Textarea
              rows={6}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Speak or type your answer…"
            />
            <div className="flex justify-end">
              <Button
                onClick={next}
                disabled={loading}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {current + 1 === questions.length ? "Finish & Get Feedback" : "Next Question"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === "done" && feedback && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Overall score</div>
                <div className="text-5xl font-bold text-gradient">{feedback.overallScore}</div>
              </div>
              <Button variant="outline" onClick={reset}>
                <Sparkles className="mr-2 h-4 w-4" /> New Interview
              </Button>
            </div>
            <Progress value={feedback.overallScore} className="mt-3" />
            <p className="mt-4 text-sm text-muted-foreground">{feedback.verdict}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Strengths" items={feedback.strengths} tone="success" />
            <Panel title="Improvements" items={feedback.improvements} tone="warning" />
          </div>

          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold">Per-question feedback</h3>
            {questions.map((q, i) => (
              <div key={i} className="border-t border-border/40 pt-3 first:border-0 first:pt-0">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm font-medium">
                    Q{i + 1}. {q}
                  </div>
                  <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-xs">
                    {feedback.perQuestion[i]?.score ?? 0}/10
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground italic">
                  Your answer: {answers[i] || "(no answer)"}
                </div>
                <div className="mt-1 text-sm">{feedback.perQuestion[i]?.feedback}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "warning";
}) {
  const dot = tone === "success" ? "bg-success" : "bg-warning";
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {items?.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dot} shrink-0`} /> {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
