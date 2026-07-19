import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiSummarize } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Sparkles, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [result, setResult] = useState<Result | null>(null);

  const onFile = async (file: File) => {
    if (!file) return;
    if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      setText(await file.text());
      setTitle(file.name);
    } else {
      toast.info("For PDF/DOCX/images, please paste the extracted text directly. Full parsing coming soon!");
    }
  };

  const run = async () => {
    if (text.trim().length < 20) return toast.error("Paste at least a paragraph of study material");
    setLoading(true);
    try {
      const r = await summarize({ data: { text, title } });
      setResult(r as Result);
      await supabase.from("notes").insert({
        user_id: (await supabase.auth.getUser()).data.user!.id,
        title: title || "Untitled",
        source_text: text.slice(0, 5000),
        summary: r.summary ?? null,
        key_points: r.keyPoints ?? [],
        flashcards: r.flashcards ?? [],
        quiz: r.quiz ?? [],
      });
      toast.success("Summary saved to your library");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-7 w-7 text-primary-glow" /> Notes Summarizer</h1>
        <p className="text-muted-foreground mt-1">Paste any material and get summary, key points, flashcards, and a quiz.</p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          placeholder="Paste your notes, textbook chapter, article, or lecture transcript here…"
          value={text} onChange={(e) => setText(e.target.value)} rows={10}
        />
        <div className="flex flex-wrap gap-2 items-center">
          <label className="glass rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:border-primary/40">
            <Upload className="h-4 w-4" /> Upload .txt
            <input type="file" accept=".txt,.md,text/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <Button onClick={run} disabled={loading} className="bg-gradient-to-r from-primary to-accent">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate
          </Button>
          <span className="text-xs text-muted-foreground">{text.length} chars</span>
        </div>
      </div>

      {result && (
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
            <button key={i} onClick={() => setPick(i)}
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
