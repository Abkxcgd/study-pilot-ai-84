import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiTutor } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lightbulb, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/tutor")({ component: TutorPage });

const MermaidRenderer = lazy(() => import("@/components/MermaidRenderer"));

function TutorPage() {
  const run = useServerFn(aiTutor);
  const [concept, setConcept] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");

  const ask = async () => {
    if (!concept.trim()) return toast.error("What do you want explained?");
    setLoading(true);
    try {
      const res = await run({ data: { concept, level } });
      setContent(res.content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent"><Lightbulb className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">AI Tutor</h1>
          <p className="text-sm text-muted-foreground">Deep explanations with real-world examples & Mermaid diagrams.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div><Label>Concept</Label><Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="e.g. Backpropagation, recursion, TCP handshake" /></div>
          <div>
            <Label>Level</Label>
            <div className="mt-2 flex gap-2">
              {(["beginner", "intermediate", "advanced"] as const).map((d) => (
                <button key={d} onClick={() => setLevel(d)} className={`rounded-md px-3 py-1.5 text-xs capitalize transition ${level === d ? "bg-gradient-to-r from-primary to-accent text-white" : "border border-border/50 text-muted-foreground hover:text-foreground"}`}>{d}</button>
              ))}
            </div>
          </div>
        </div>
        <Button onClick={ask} disabled={loading} className="bg-gradient-to-r from-primary to-accent">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Explain
        </Button>
      </div>

      {content && (
        <div className="glass rounded-2xl p-6">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code({ className, children, ...rest }) {
                  const text = String(children).replace(/\n$/, "");
                  if (className?.includes("language-mermaid")) {
                    return (
                      <Suspense fallback={<div className="text-xs text-muted-foreground">Loading diagram…</div>}>
                        <MermaidRenderer code={text} />
                      </Suspense>
                    );
                  }
                  return <code className={className} {...rest}>{children}</code>;
                },
              }}
            >{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
