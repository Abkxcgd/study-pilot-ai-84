import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiFlashcards } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Layers,
  Sparkles,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { reviewCard, getCard, dueCount, formatDue, type Grade } from "@/lib/srs";

export const Route = createFileRoute("/_authenticated/flashcards")({ component: Page });

type Card = { question: string; answer: string };

function Page() {
  const gen = useServerFn(aiFlashcards);
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"study" | "quiz" | "review">("study");
  const [tick, setTick] = useState(0); // force re-render after grading

  const cardIds = useMemo(
    () => cards.map((c, idx) => `${topic}::${idx}::${c.question.slice(0, 40)}`),
    [cards, topic],
  );

  const dueIndexes = useMemo(() => {
    const now = Date.now();
    return cardIds
      .map((id, idx) => ({ idx, due: getCard(id).due }))
      .filter((x) => x.due <= now)
      .map((x) => x.idx);
  }, [cardIds, tick]);

  const [reviewPos, setReviewPos] = useState(0);
  const reviewIdx = dueIndexes[reviewPos];
  const dueTotal = dueCount(cardIds);

  const run = async () => {
    if (!topic.trim()) return toast.error("Enter a topic");
    setLoading(true);
    try {
      const r = await gen({ data: { topic, count: 10 } });
      setCards(r.cards);
      setI(0);
      setFlip(false);
      setReviewPos(0);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    setI((i + 1) % Math.max(1, cards.length));
    setFlip(false);
  };
  const prev = () => {
    setI((i - 1 + cards.length) % Math.max(1, cards.length));
    setFlip(false);
  };

  const grade = (g: Grade) => {
    if (reviewIdx === undefined) return;
    reviewCard(cardIds[reviewIdx], g);
    setFlip(false);
    setTick((t) => t + 1);
    setReviewPos((p) => p + 1);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="h-7 w-7 text-primary-glow" /> Flashcard Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Auto-generate flashcards on any topic. Study, quiz, and spaced-repetition review.
        </p>
      </div>

      <div className="glass rounded-2xl p-4 flex gap-2">
        <Input
          placeholder="Topic (e.g. Photosynthesis, React hooks, WW2)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <Button
          onClick={run}
          disabled={loading}
          className="bg-gradient-to-r from-primary to-accent"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}{" "}
          Generate
        </Button>
      </div>

      {cards.length > 0 && (
        <>
          <div className="flex justify-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={mode === "study" ? "default" : "outline"}
              onClick={() => setMode("study")}
            >
              Study
            </Button>
            <Button
              size="sm"
              variant={mode === "quiz" ? "default" : "outline"}
              onClick={() => setMode("quiz")}
            >
              Quiz all
            </Button>
            <Button
              size="sm"
              variant={mode === "review" ? "default" : "outline"}
              onClick={() => {
                setMode("review");
                setReviewPos(0);
                setFlip(false);
              }}
              className="gap-1"
            >
              <Brain className="h-3.5 w-3.5" /> Review ({dueTotal})
            </Button>
          </div>

          {mode === "study" && (
            <div className="space-y-4">
              <button
                onClick={() => setFlip(!flip)}
                className="glass rounded-3xl p-12 min-h-64 w-full flex items-center justify-center text-center hover:border-primary/40 transition"
              >
                <div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {flip ? "Answer" : "Question"} · {i + 1} / {cards.length}
                  </div>
                  <div className="text-xl">{flip ? cards[i].answer : cards[i].question}</div>
                  <div className="text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
                    <RotateCw className="h-3 w-3" /> Click to flip
                  </div>
                </div>
              </button>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={prev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={next}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {mode === "quiz" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((c, idx) => (
                <details key={idx} className="glass rounded-xl p-4 group">
                  <summary className="cursor-pointer font-medium">{c.question}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{c.answer}</p>
                </details>
              ))}
            </div>
          )}

          {mode === "review" && (
            <div className="space-y-4">
              {reviewIdx === undefined ? (
                <div className="glass rounded-3xl p-12 text-center">
                  <div className="text-2xl font-semibold">All caught up 🎉</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    No cards due right now. Come back later — your next review is scheduled based on
                    how well you knew each card.
                  </p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2 text-left">
                    {cards.map((c, idx) => {
                      const meta = getCard(cardIds[idx]);
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-border/40 bg-white/5 px-3 py-2 text-xs"
                        >
                          <div className="font-medium truncate">{c.question}</div>
                          <div className="text-muted-foreground mt-0.5">
                            {formatDue(meta.due)} · ease {meta.ease.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setFlip(!flip)}
                    className="glass rounded-3xl p-12 min-h-64 w-full flex items-center justify-center text-center hover:border-primary/40 transition"
                  >
                    <div>
                      <div className="text-xs text-muted-foreground mb-3">
                        {flip ? "Answer" : "Question"} · {reviewPos + 1} / {dueIndexes.length} due
                      </div>
                      <div className="text-xl">
                        {flip ? cards[reviewIdx].answer : cards[reviewIdx].question}
                      </div>
                      <div className="text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
                        <RotateCw className="h-3 w-3" /> Click to flip
                      </div>
                    </div>
                  </button>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      className="border-destructive/40 text-destructive"
                      onClick={() => grade("again")}
                    >
                      Again
                    </Button>
                    <Button variant="outline" onClick={() => grade("hard")}>
                      Hard
                    </Button>
                    <Button variant="outline" onClick={() => grade("good")}>
                      Good
                    </Button>
                    <Button
                      variant="outline"
                      className="border-success/40 text-success"
                      onClick={() => grade("easy")}
                    >
                      Easy
                    </Button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Ratings tune the next review — Again resets, Easy pushes further out.
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
