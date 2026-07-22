import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiResumeBuild } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, FileUser, Sparkles, Download, FileType } from "lucide-react";
import { exportPdf, exportDocx } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/resume-builder")({
  component: ResumeBuilderPage,
});

type Resume = {
  summary: string;
  skills: string[];
  experience: { role: string; company: string; dates: string; bullets: string[] }[];
  projects: { name: string; stack: string; bullets: string[] }[];
  education: { degree: string; school: string; dates: string }[];
  atsScore: number;
  atsTips: string[];
};

const initial = {
  fullName: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  links: "",
  targetRole: "",
  experience: "",
  education: "",
  skills: "",
  projects: "",
};

function ResumeBuilderPage() {
  const run = useServerFn(aiResumeBuild);
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [resume, setResume] = useState<Resume | null>(null);

  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const generate = async () => {
    if (!form.fullName.trim()) return toast.error("Add your name");
    setLoading(true);
    try {
      const r = (await run({ data: form })) as Resume;
      setResume(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const buildBody = () => {
    if (!resume) return "";
    const contact = [form.email, form.phone, form.location, form.links].filter(Boolean).join(" • ");
    return [
      form.fullName.toUpperCase(),
      form.title || form.targetRole,
      contact,
      "",
      "SUMMARY",
      resume.summary,
      "",
      "SKILLS",
      resume.skills.join(" • "),
      "",
      "EXPERIENCE",
      ...resume.experience.map(
        (x) => `${x.role} — ${x.company} (${x.dates})\n${x.bullets.map((b) => `• ${b}`).join("\n")}`,
      ),
      "",
      "PROJECTS",
      ...resume.projects.map(
        (p) => `${p.name} [${p.stack}]\n${p.bullets.map((b) => `• ${b}`).join("\n")}`,
      ),
      "",
      "EDUCATION",
      ...resume.education.map((e) => `${e.degree} — ${e.school} (${e.dates})`),
    ]
      .filter(Boolean)
      .join("\n");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <FileUser className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">AI Resume Builder</h1>
          <p className="text-sm text-muted-foreground">
            ATS-optimized, tailored to your target role. Export as PDF or DOCX.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.fullName} onChange={set("fullName")} />
            </Field>
            <Field label="Current title">
              <Input value={form.title} onChange={set("title")} placeholder="e.g. CS Student" />
            </Field>
            <Field label="Target role">
              <Input value={form.targetRole} onChange={set("targetRole")} placeholder="Frontend Engineer Intern" />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={set("location")} />
            </Field>
          </div>
          <Field label="Links (GitHub, LinkedIn, portfolio)">
            <Input value={form.links} onChange={set("links")} />
          </Field>
          <Field label="Skills (comma or newline separated)">
            <Textarea rows={2} value={form.skills} onChange={set("skills")} />
          </Field>
          <Field label="Experience (jobs, internships — free form)">
            <Textarea rows={4} value={form.experience} onChange={set("experience")} />
          </Field>
          <Field label="Projects">
            <Textarea rows={3} value={form.projects} onChange={set("projects")} />
          </Field>
          <Field label="Education">
            <Textarea rows={2} value={form.education} onChange={set("education")} />
          </Field>
          <Button
            onClick={generate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Build ATS Resume
          </Button>
        </div>

        <div className="space-y-4">
          {resume ? (
            <>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">ATS Score</div>
                    <div className="text-4xl font-bold text-gradient">{resume.atsScore}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportPdf(form.fullName || "resume", buildBody())}>
                      <Download className="h-4 w-4 mr-1" /> PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportDocx(form.fullName || "resume", buildBody())}>
                      <FileType className="h-4 w-4 mr-1" /> DOCX
                    </Button>
                  </div>
                </div>
                <Progress value={resume.atsScore} className="mt-3" />
                {resume.atsTips.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                    {resume.atsTips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass rounded-2xl p-6 space-y-5">
                <div>
                  <div className="text-xl font-bold">{form.fullName || "Your Name"}</div>
                  <div className="text-sm text-muted-foreground">
                    {form.title || form.targetRole}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {[form.email, form.phone, form.location].filter(Boolean).join(" • ")}
                  </div>
                </div>
                <Sec title="Summary">
                  <p className="text-sm">{resume.summary}</p>
                </Sec>
                <Sec title="Skills">
                  <div className="flex flex-wrap gap-1.5">
                    {resume.skills.map((s, i) => (
                      <span key={i} className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </Sec>
                <Sec title="Experience">
                  {resume.experience.map((x, i) => (
                    <div key={i} className="mb-3">
                      <div className="text-sm font-semibold">
                        {x.role} — <span className="text-muted-foreground">{x.company}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{x.dates}</div>
                      <ul className="mt-1 list-disc pl-5 text-sm space-y-0.5">
                        {x.bullets.map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </Sec>
                <Sec title="Projects">
                  {resume.projects.map((p, i) => (
                    <div key={i} className="mb-3">
                      <div className="text-sm font-semibold">
                        {p.name}{" "}
                        <span className="text-xs text-muted-foreground">[{p.stack}]</span>
                      </div>
                      <ul className="mt-1 list-disc pl-5 text-sm space-y-0.5">
                        {p.bullets.map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </Sec>
                <Sec title="Education">
                  {resume.education.map((e, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-semibold">{e.degree}</span> — {e.school}{" "}
                      <span className="text-xs text-muted-foreground">({e.dates})</span>
                    </div>
                  ))}
                </Sec>
              </div>
            </>
          ) : (
            <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
              Fill in the form and generate a polished, ATS-optimized resume.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-primary-glow mb-2">{title}</div>
      {children}
    </div>
  );
}
