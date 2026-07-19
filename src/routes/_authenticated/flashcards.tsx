import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiFlashcards } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Layers, Sparkles, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/flashcards")({ component: Page });

type Card = { question: string; answer: string };

function Page() {
  const gen = useServerFn(aiFlashcards);
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"study" | "quiz">("study");

  const run = async () => {
    if (!topic.trim()) return toast.error("Enter a topic");
    setLoading(true);
    try {
      const r = await gen({ data: { topic, count: 10 } });
      setCards(r.cards); setI(0); setFlip(false);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  };

  const next = () => { setI((i + 1) % Math.max(1, cards.length)); setFlip(false); };
  const prev = () => { setI((i - 1 + cards.length) % Math.max(1, cards.length)); setFlip(false); };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Layers className="h-7 w-7 text-primary-glow" /> Flashcard Generator</h1>
        <p className="text-muted-foreground mt-1">Auto-generate flashcards on any topic. Study & quiz modes.</p>
      </div>

      <div className="glass rounded-2xl p-4 flex gap-2">
        <Input placeholder="Topic (e.g. Photosynthesis, React hooks, WW2)" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <Button onClick={run} disabled={loading} className="bg-gradient-to-r from-primary to-accent">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate
        </Button>
      </div>

      {cards.length > 0 && (
        <>
          <div className="flex justify-center gap-2">
            <Button size="sm" variant={mode === "study" ? "default" : "outline"} onClick={() => setMode("study")}>Study</Button>
            <Button size="sm" variant={mode === "quiz" ? "default" : "outline"} onClick={() => setMode("quiz")}>Quiz all</Button>
          </div>

          {mode === "study" ? (
            <div className="space-y-4">
              <button onClick={() => setFlip(!flip)} className="glass rounded-3xl p-12 min-h-64 w-full flex items-center justify-center text-center hover:border-primary/40 transition">
                <div>
                  <div className="text-xs text-muted-foreground mb-3">{flip ? "Answer" : "Question"} · {i + 1} / {cards.length}</div>
                  <div className="text-xl">{flip ? cards[i].answer : cards[i].question}</div>
                  <div className="text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1"><RotateCw className="h-3 w-3" /> Click to flip</div>
                </div>
              </button>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((c, idx) => (
                <details key={idx} className="glass rounded-xl p-4 group">
                  <summary className="cursor-pointer font-medium">{c.question}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{c.answer}</p>
                </details>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
