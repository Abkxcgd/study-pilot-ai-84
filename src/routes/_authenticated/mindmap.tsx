import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiMindMap } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Network, Sparkles, Copy } from "lucide-react";

const MermaidRenderer = lazy(() => import("@/components/MermaidRenderer"));

export const Route = createFileRoute("/_authenticated/mindmap")({ component: MindMapPage });

function MindMapPage() {
  const run = useServerFn(aiMindMap);
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<"mindmap" | "flowchart" | "tree">("mindmap");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ title: string; mermaid: string; summary: string } | null>(
    null,
  );

  const generate = async () => {
    if (topic.trim().length < 2) return toast.error("Enter a topic");
    setLoading(true);
    try {
      const r = (await run({ data: { topic, style } })) as typeof data;
      setData(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <Network className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">AI Mind Map</h1>
          <p className="text-sm text-muted-foreground">
            Turn any topic into a mind map, flowchart, or concept tree.
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div>
          <Label>Topic</Label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Neural Networks, WWII, Photosynthesis"
          />
        </div>
        <div>
          <Label className="mb-2 block">Style</Label>
          <Tabs value={style} onValueChange={(v) => setStyle(v as typeof style)}>
            <TabsList>
              <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
              <TabsTrigger value="flowchart">Flowchart</TabsTrigger>
              <TabsTrigger value="tree">Concept Tree</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
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
          Generate
        </Button>
      </div>

      {data && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">{data.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data.summary}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            {data.mermaid ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                }
              >
                <MermaidRenderer code={data.mermaid} />
              </Suspense>
            ) : (
              <p className="text-sm text-muted-foreground">No diagram returned.</p>
            )}
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(data.mermaid);
                  toast.success("Mermaid copied");
                }}
              >
                <Copy className="mr-1 h-3 w-3" /> Copy Mermaid
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
