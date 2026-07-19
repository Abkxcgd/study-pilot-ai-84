import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiSecondBrain, aiIngest } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Brain, Loader2, Sparkles, Upload } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/brain")({ component: Page });

type Source = {
  id: string;
  source_type: string;
  content: string;
  similarity: number;
  metadata: { title?: string | null };
};

function Page() {
  const ask = useServerFn(aiSecondBrain);
  const ingest = useServerFn(aiIngest);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestText, setIngestText] = useState("");
  const [ingesting, setIngesting] = useState(false);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setAnswer("");
    setSources([]);
    try {
      const r = await ask({ data: { question: q } });
      setAnswer(r.answer);
      setSources(r.sources as Source[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const addKnowledge = async () => {
    if (!ingestText.trim()) return toast.error("Paste some content first");
    setIngesting(true);
    try {
      const r = await ingest({
        data: {
          sourceType: "custom",
          title: ingestTitle || "Untitled",
          content: ingestText,
        },
      });
      toast.success(`Indexed ${r.inserted} chunks`);
      setIngestText("");
      setIngestTitle("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary-glow" /> AI Second Brain
        </h1>
        <p className="text-muted-foreground mt-1">
          Ask anything about your notes, tasks and events. Answers are grounded in your own material.
        </p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. What did I learn about transformers last week?"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <Button onClick={run} disabled={loading} className="bg-gradient-to-r from-primary to-accent">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {answer && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
          {sources.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <p className="text-sm font-semibold mb-2 text-muted-foreground">Sources</p>
              <div className="grid gap-2">
                {sources.map((s, i) => (
                  <div key={s.id} className="text-xs bg-white/5 rounded-lg p-3">
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>[#{i + 1}] {s.metadata?.title ?? s.source_type}</span>
                      <span>{Math.round(s.similarity * 100)}% match</span>
                    </div>
                    <p className="line-clamp-3">{s.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4" /> Add knowledge
        </h2>
        <Input
          placeholder="Title (optional)"
          value={ingestTitle}
          onChange={(e) => setIngestTitle(e.target.value)}
        />
        <Textarea
          rows={6}
          placeholder="Paste lecture notes, textbook excerpts, meeting minutes…"
          value={ingestText}
          onChange={(e) => setIngestText(e.target.value)}
        />
        <Button onClick={addKnowledge} disabled={ingesting} variant="outline">
          {ingesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Index into Second Brain
        </Button>
      </div>
    </div>
  );
}
