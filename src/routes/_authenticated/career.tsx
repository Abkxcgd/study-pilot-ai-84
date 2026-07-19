import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiCareer } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Briefcase, Sparkles, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/career")({ component: CareerPage });

function CareerPage() {
  const run = useServerFn(aiCareer);
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<{ atsScore?: number; strengths?: string[]; weaknesses?: string[]; improvements?: string[]; missingKeywords?: string[]; summary?: string } | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [interview, setInterview] = useState<{ question: string; type: string; sampleAnswer: string }[]>([]);

  const call = async (mode: "analyze" | "cover_letter" | "linkedin" | "interview") => {
    if ((mode === "analyze" || mode === "cover_letter" || mode === "linkedin") && !resume.trim()) {
      return toast.error("Paste your resume first");
    }
    setLoading(mode);
    try {
      const res = await run({ data: { mode, resume: resume || undefined, jobDescription: job || undefined, role: role || undefined } });
      if (mode === "analyze") setAnalysis(res);
      if (mode === "cover_letter") setCoverLetter((res as { content: string }).content);
      if (mode === "linkedin") setHeadlines((res as { headlines: string[] }).headlines ?? []);
      if (mode === "interview") setInterview((res as { questions: typeof interview }).questions ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent"><Briefcase className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">AI Career Assistant</h1>
          <p className="text-sm text-muted-foreground">Resume analysis, ATS scoring, cover letters, LinkedIn & interview prep.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Target role (optional)</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Engineer Intern" /></div>
          <div><Label>Job description (optional)</Label><Input value={job} onChange={(e) => setJob(e.target.value)} placeholder="Paste JD keywords or link text" /></div>
        </div>
        <div>
          <Label>Your resume (plain text)</Label>
          <Textarea rows={10} value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste resume content here..." />
        </div>
      </div>

      <Tabs defaultValue="analyze">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="analyze">ATS Analyzer</TabsTrigger>
          <TabsTrigger value="cover">Cover Letter</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          <TabsTrigger value="interview">Interview</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="mt-4">
          <Button onClick={() => call("analyze")} disabled={loading === "analyze"} className="bg-gradient-to-r from-primary to-accent">
            {loading === "analyze" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Analyze Resume
          </Button>
          {analysis && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="glass rounded-2xl p-6">
                <div className="text-xs uppercase text-muted-foreground">ATS Score</div>
                <div className="mt-1 text-5xl font-bold text-gradient">{analysis.atsScore ?? 0}</div>
                <Progress value={analysis.atsScore ?? 0} className="mt-3" />
                <p className="mt-4 text-sm text-muted-foreground">{analysis.summary}</p>
              </div>
              <Section title="Strengths" items={analysis.strengths} tone="success" />
              <Section title="Weaknesses" items={analysis.weaknesses} tone="warning" />
              <Section title="Improvement suggestions" items={analysis.improvements} tone="primary" />
              <Section title="Missing keywords" items={analysis.missingKeywords} tone="accent" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="cover" className="mt-4 space-y-3">
          <Button onClick={() => call("cover_letter")} disabled={loading === "cover_letter"} className="bg-gradient-to-r from-primary to-accent">
            {loading === "cover_letter" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate Cover Letter
          </Button>
          {coverLetter && (
            <div className="glass rounded-2xl p-6">
              <div className="flex justify-end mb-2"><Button size="sm" variant="ghost" onClick={() => copy(coverLetter)}><Copy className="h-4 w-4 mr-1" /> Copy</Button></div>
              <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{coverLetter}</ReactMarkdown></div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="linkedin" className="mt-4 space-y-3">
          <Button onClick={() => call("linkedin")} disabled={loading === "linkedin"} className="bg-gradient-to-r from-primary to-accent">
            {loading === "linkedin" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate Headlines
          </Button>
          <div className="space-y-2">
            {headlines.map((h, i) => (
              <div key={i} className="glass rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="text-sm">{h}</div>
                <Button size="sm" variant="ghost" onClick={() => copy(h)}><Copy className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="interview" className="mt-4 space-y-3">
          <Button onClick={() => call("interview")} disabled={loading === "interview"} className="bg-gradient-to-r from-primary to-accent">
            {loading === "interview" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate Interview Questions
          </Button>
          <div className="space-y-3">
            {interview.map((q, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <div className="text-xs uppercase text-accent">{q.type}</div>
                <div className="mt-1 font-medium">{q.question}</div>
                <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{q.sampleAnswer}</div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, items, tone }: { title: string; items?: string[]; tone: "success" | "warning" | "primary" | "accent" }) {
  if (!items?.length) return null;
  const dot = { success: "bg-success", warning: "bg-warning", primary: "bg-primary", accent: "bg-accent" }[tone];
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm"><span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dot} shrink-0`} /> {s}</li>
        ))}
      </ul>
    </div>
  );
}
