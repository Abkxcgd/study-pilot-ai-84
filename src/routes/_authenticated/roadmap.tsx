import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiRoadmap } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Map, Sparkles, Download } from "lucide-react";
import { exportPdf } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/roadmap")({ component: RoadmapPage });

type Phase = {
  title: string;
  durationWeeks: number;
  skills: string[];
  courses: { name: string; provider: string }[];
  certifications: string[];
  projects: string[];
  milestone: string;
};
type Roadmap = {
  overview: string;
  phases: Phase[];
  topSkills: string[];
  salaryRange: string;
  tips: string[];
};

function RoadmapPage() {
  const run = useServerFn(aiRoadmap);
  const [career, setCareer] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Roadmap | null>(null);

  const generate = async () => {
    if (career.trim().length < 2) return toast.error("Enter a career goal");
    setLoading(true);
    try {
      const r = (await run({
        data: { career, currentLevel: level, timeframeMonths: months },
      })) as Roadmap;
      setData(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!data) return;
    const body =
      `${data.overview}\n\nSalary range: ${data.salaryRange}\n\nTop skills:\n${data.topSkills.map((s) => `• ${s}`).join("\n")}\n\n` +
      data.phases
        .map(
          (p) =>
            `${p.title} (${p.durationWeeks} weeks)\n  Skills: ${p.skills.join(", ")}\n  Courses: ${p.courses.map((c) => `${c.name} — ${c.provider}`).join("; ")}\n  Certifications: ${p.certifications.join(", ")}\n  Projects: ${p.projects.join(", ")}\n  Milestone: ${p.milestone}`,
        )
        .join("\n\n") +
      `\n\nTips:\n${data.tips.map((t) => `• ${t}`).join("\n")}`;
    exportPdf(`${career}-roadmap`, body);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <Map className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">AI Career Roadmap</h1>
          <p className="text-sm text-muted-foreground">
            Personalized skills, courses, certifications & projects to reach your dream role.
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label>Career goal</Label>
          <Input
            value={career}
            onChange={(e) => setCareer(e.target.value)}
            placeholder="e.g. Full-Stack AI Engineer"
          />
        </div>
        <div>
          <Label>Months</Label>
          <Input
            type="number"
            min={1}
            max={36}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value) || 12)}
          />
        </div>
        <div className="sm:col-span-3">
          <Label className="mb-2 block">Current level</Label>
          <Tabs value={level} onValueChange={(v) => setLevel(v as typeof level)}>
            <TabsList>
              <TabsTrigger value="beginner">Beginner</TabsTrigger>
              <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="sm:col-span-3 flex gap-2">
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
            Generate Roadmap
          </Button>
          {data && (
            <Button variant="outline" onClick={download}>
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          )}
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <p className="text-sm leading-relaxed">{data.overview}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Top skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.topSkills.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Salary range</div>
                <div className="text-lg font-semibold text-gradient">{data.salaryRange}</div>
              </div>
            </div>
          </div>

          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-primary via-accent to-transparent" />
            {data.phases.map((p, i) => (
              <div key={i} className="relative mb-6">
                <div className="absolute -left-[18px] top-2 h-3 w-3 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40" />
                <div className="glass rounded-2xl p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {p.durationWeeks} weeks
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.milestone}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Chips label="Skills" items={p.skills} />
                    <Chips label="Certifications" items={p.certifications} />
                    <div>
                      <div className="text-xs uppercase text-muted-foreground mb-1">Courses</div>
                      <ul className="space-y-1 text-sm">
                        {p.courses?.map((c, j) => (
                          <li key={j}>
                            <span className="font-medium">{c.name}</span>{" "}
                            <span className="text-muted-foreground">— {c.provider}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground mb-1">Projects</div>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {p.projects?.map((pr, j) => <li key={j}>{pr}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.tips.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-2">Pro tips</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {data.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s, i) => (
          <span
            key={i}
            className="rounded-full border border-border/40 px-2 py-0.5 text-xs text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
