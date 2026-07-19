import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiGenerate } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookOpen, Download, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { exportPdf, exportDocx } from "@/lib/exports";
import { awardXp, XP } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/assignments")({ component: Page });

function Page() {
  const gen = useServerFn(aiGenerate);
  const [kind, setKind] = useState<"assignment" | "report" | "ppt" | "code" | "research">("assignment");
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!topic.trim()) return toast.error("Enter a topic");
    setLoading(true);
    try {
      const r = await gen({ data: { kind, topic, details } });
      setContent(r.content);
      await awardXp(XP.ASSIGNMENT_GENERATED, "Assignment ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><BookOpen className="h-7 w-7 text-primary-glow" /> Assignment Generator</h1>
        <p className="text-muted-foreground mt-1">Generate assignments, reports, PPT outlines, code, or research notes.</p>
      </div>

      <div className="glass rounded-2xl p-6 grid gap-3 md:grid-cols-[180px_1fr_auto]">
        <Select value={kind} onValueChange={(v: any) => setKind(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="report">Report</SelectItem>
            <SelectItem value="ppt">PPT Outline</SelectItem>
            <SelectItem value="code">Code</SelectItem>
            <SelectItem value="research">Research Notes</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Topic (e.g. Impact of AI on healthcare)" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <Button onClick={run} disabled={loading} className="bg-gradient-to-r from-primary to-accent">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate
        </Button>
        <Textarea className="md:col-span-3" placeholder="Extra requirements, tone, word count, references style…" value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>

      {content && (
        <div className="glass rounded-2xl p-6">
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => download("text/markdown", "md")}><Download className="mr-2 h-4 w-4" />MD</Button>
            <Button variant="outline" size="sm" onClick={() => download("application/msword", "doc")}><Download className="mr-2 h-4 w-4" />DOC</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />Print/PDF</Button>
          </div>
          <div className="prose prose-invert max-w-none [&_pre]:bg-black/40 [&_pre]:rounded-lg [&_code]:text-accent">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
