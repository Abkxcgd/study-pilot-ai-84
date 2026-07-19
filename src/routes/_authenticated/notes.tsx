import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiSummarize, aiIngest } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, FileText, Sparkles, Upload, Download, FileType } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseAny } from "@/lib/document-parsers";
import { exportPdf, exportDocx } from "@/lib/exports";
import { awardXp, XP } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/notes")({ component: NotesPage });

type Result = {
  summary?: string;
  keyPoints?: string[];
  flashcards?: { question: string; answer: string }[];
  quiz?: { question: string; options: string[]; answerIndex: number }[];
  importantQuestions?: string[];
};

function NotesPage() {
  const summarize = useServerFn(aiSummarize);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseKind, setParseKind] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);

  const onFile = async (file: File) => {
    if (!file) return;
    setParsing(true);
    setParseProgress(0);
    setParseKind("");
    try {
      const { text: t, kind } = await parseAny(file, (p) => setParseProgress(p));
      if (!t || t.length < 10) {
        toast.error("Couldn't extract text from that file.");
        return;
      }
      setText(t);
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      setParseKind(kind);
      toast.success(`${kind.toUpperCase()} parsed · ${t.length} chars`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to parse file";
      toast.error(msg);
    } finally {
      setParsing(false);
      setParseProgress(0);
    }
  };

  const run = async () => {
    if (text.trim().length < 20) return toast.error("Paste at least a paragraph of study material");
    setLoading(true);
    try {
      const r = (await summarize({ data: { text, title } })) as Result;
      setResult(r);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("notes").insert({
          user_id: u.user.id,
          title: title || "Untitled",
          source_text: text.slice(0, 5000),
          summary: r.summary ?? null,
          key_points: r.keyPoints ?? [],
          flashcards: r.flashcards ?? [],
          quiz: r.quiz ?? [],
        });
      }
      await awardXp(XP.NOTE_SUMMARIZED, "Note summarized");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const buildExportBody = () => {
    if (!result) return "";
    let body = result.summary ? `SUMMARY\n\n${result.summary}\n\n` : "";
    if (result.keyPoints?.length) body += `KEY POINTS\n\n${result.keyPoints.map((p) => `• ${p}`).join("\n")}\n\n`;
    if (result.importantQuestions?.length) body += `IMPORTANT QUESTIONS\n\n${result.importantQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\n`;
    if (result.flashcards?.length) body += `FLASHCARDS\n\n${result.flashcards.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}\n\n`;
    return body.trim();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-7 w-7 text-primary-glow" /> Notes Summarizer</h1>
        <p className="text-muted-foreground mt-1">Upload PDF, DOCX, images, or paste text. AI turns it into a summary, flashcards, and a quiz.</p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          placeholder="Paste your notes, textbook chapter, article, or lecture transcript here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
        />
        <div className="flex flex-wrap gap-2 items-center">
          <label className="glass rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:border-primary/40">
            <Upload className="h-4 w-4" /> Upload PDF, DOCX, image or text
            <input
              type="file"
              accept=".txt,.md,.pdf,.docx,text/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
          <Button onClick={run} disabled={loading || parsing} className="bg-gradient-to-r from-primary to-accent">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate
          </Button>
          <span className="text-xs text-muted-foreground">{text.length} chars {parseKind && `· from ${parseKind}`}</span>
        </div>
        {parsing && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Parsing file…</div>
            <Progress value={parseProgress * 100} />
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => exportPdf(title || "notes", buildExportBody())}>
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportDocx(title || "notes", buildExportBody())}>
              <FileType className="mr-2 h-4 w-4" /> Export DOCX
            </Button>
          </div>
          <Tabs defaultValue="summary">
            <TabsList className="grid grid-cols-4 max-w-md">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="points">Key points</TabsTrigger>
              <TabsTrigger value="flash">Flashcards</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="glass rounded-2xl p-6 mt-4">
              <p className="leading-relaxed">{result.summary}</p>
              {result.importantQuestions && result.importantQuestions.length > 0 && (
                <>
                  <h3 className="font-semibold mt-6 mb-2">Important questions</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {result.importantQuestions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </>
              )}
            </TabsContent>
            <TabsContent value="points" className="glass rounded-2xl p-6 mt-4">
              <ul className="space-y-2">
                {result.keyPoints?.map((p, i) => (
                  <li key={i} className="flex gap-3"><span className="text-primary-glow">•</span>{p}</li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="flash" className="mt-4 grid gap-3 sm:grid-cols-2">
              {result.flashcards?.map((c, i) => <Flashcard key={i} q={c.question} a={c.answer} />)}
            </TabsContent>
            <TabsContent value="quiz" className="mt-4 space-y-3">
              {result.quiz?.map((q, i) => <QuizItem key={i} q={q} />)}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function Flashcard({ q, a }: { q: string; a: string }) {
  const [flip, setFlip] = useState(false);
  return (
    <button onClick={() => setFlip(!flip)} className="glass rounded-2xl p-5 text-left min-h-32 hover:border-primary/40">
      <div className="text-xs text-muted-foreground">{flip ? "Answer" : "Question"}</div>
      <div className="mt-2">{flip ? a : q}</div>
    </button>
  );
}
function QuizItem({ q }: { q: { question: string; options: string[]; answerIndex: number } }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="glass rounded-2xl p-5">
      <div className="font-medium">{q.question}</div>
      <div className="mt-3 grid gap-2">
        {q.options.map((o, i) => {
          const correct = pick !== null && i === q.answerIndex;
          const wrong = pick === i && i !== q.answerIndex;
          return (
            <button
              key={i}
              onClick={() => setPick(i)}
              className={`text-left rounded-lg border px-3 py-2 text-sm transition ${
                correct ? "border-success bg-success/10" :
                wrong ? "border-destructive bg-destructive/10" :
                "border-border/40 hover:border-primary/40"
              }`}
            >{o}</button>
          );
        })}
      </div>
    </div>
  );
}
