import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3.5-flash";
const EMBED_MODEL = "openai/text-embedding-3-small";

function getKey() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

function getModel() {
  const gw = createLovableAiGatewayProvider(getKey());
  return gw(MODEL);
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

function chunk(text: string, size = 800): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const out: string[] = [];
  for (let i = 0; i < clean.length; i += size) out.push(clean.slice(i, i + size));
  return out.slice(0, 30);
}

const IngestInput = z.object({
  sourceType: z.enum(["note", "task", "event", "custom"]),
  sourceId: z.string().uuid().optional(),
  title: z.string().optional(),
  content: z.string().min(1),
});

export const aiIngest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => IngestInput.parse(v))
  .handler(async ({ data, context }) => {
    const chunks = chunk(data.content);
    if (chunks.length === 0) return { inserted: 0 };
    // Remove previous embeddings for the same source
    if (data.sourceId) {
      await context.supabase.from("embeddings").delete().eq("source_id", data.sourceId);
    }
    const rows = await Promise.all(
      chunks.map(async (c) => ({
        user_id: context.userId,
        source_type: data.sourceType,
        source_id: data.sourceId ?? null,
        content: c,
        metadata: { title: data.title ?? null },
        embedding: await embed(c),
      })),
    );
    const { error } = await context.supabase.from("embeddings").insert(rows as never);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

const AskInput = z.object({ question: z.string().min(2) });

export const aiSecondBrain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => AskInput.parse(v))
  .handler(async ({ data, context }) => {
    const qVec = await embed(data.question);
    const { data: matches, error } = await context.supabase.rpc("match_embeddings", {
      query_embedding: qVec as never,
      match_user: context.userId,
      match_count: 8,
    });
    if (error) throw new Error(error.message);
    const ctx = (matches ?? [])
      .map(
        (m: { source_type: string; content: string }, i: number) =>
          `[#${i + 1} ${m.source_type}] ${m.content}`,
      )
      .join("\n\n");
    const system =
      "You are the student's Second Brain. Answer using ONLY the provided context from their notes, tasks, and events. Cite sources like [#1]. If the answer is not in the context, say so and suggest what to upload.";
    const { text } = await generateText({
      model: getModel(),
      system,
      prompt: `CONTEXT:\n${ctx || "(empty)"}\n\nQUESTION: ${data.question}`,
    });
    return {
      answer: text,
      sources: (matches ?? []) as Array<{
        id: string;
        source_type: string;
        source_id: string | null;
        content: string;
        similarity: number;
        metadata: { title?: string | null };
      }>,
    };
  });

const ChatInput = z.object({
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() }),
  ),
  system: z.string().optional(),
});

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ChatInput.parse(v))
  .handler(async ({ data }) => {
    const system =
      data.system ??
      "You are StudyPilot AI, a friendly study assistant for students. Explain clearly, use markdown, and be concise. When helpful, use bullet lists, code blocks, and step-by-step reasoning.";
    const { text } = await generateText({
      model: getModel(),
      system,
      messages: data.messages,
    });
    return { text };
  });

const SummarizeInput = z.object({ text: z.string().min(10), title: z.string().optional() });

export const aiSummarize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SummarizeInput.parse(v))
  .handler(async ({ data }) => {
    const prompt = `Analyze the following study material and return STRICT JSON with keys: summary (string, 3-5 sentences), keyPoints (array of 5-8 strings), flashcards (array of {question, answer}, 6-10), quiz (array of {question, options: string[4], answerIndex: number}, 4-6), importantQuestions (array of 4-6 strings). Return ONLY JSON, no markdown fences.\n\nTITLE: ${data.title ?? "Untitled"}\n\nMATERIAL:\n${data.text.slice(0, 20000)}`;
    const { text } = await generateText({ model: getModel(), prompt });
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return { summary: cleaned, keyPoints: [], flashcards: [], quiz: [], importantQuestions: [] };
    }
  });

const GenerateInput = z.object({
  kind: z.enum(["assignment", "report", "ppt", "code", "research"]),
  topic: z.string().min(2),
  details: z.string().optional(),
});

export const aiGenerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => GenerateInput.parse(v))
  .handler(async ({ data }) => {
    const prompts: Record<string, string> = {
      assignment: `Write a comprehensive student assignment on "${data.topic}". Include: title, introduction, 4-6 body sections with headings, conclusion, and 5 references. Use markdown.`,
      report: `Write a formal academic report on "${data.topic}". Include abstract, introduction, methodology, findings, discussion, conclusion. Use markdown headings.`,
      ppt: `Create a slide-by-slide PPT outline for "${data.topic}" with 10 slides. For each slide give: title, 3-5 bullet points, and speaker notes. Markdown.`,
      code: `Write clean, well-commented code and explanation for: "${data.topic}". Use markdown code blocks and explain each part.`,
      research: `Write detailed research notes on "${data.topic}" — background, key concepts, current research, open problems, references. Markdown.`,
    };
    const { text } = await generateText({
      model: getModel(),
      prompt: `${prompts[data.kind]}\n\nExtra details: ${data.details ?? "none"}`,
    });
    return { content: text };
  });

const PlannerInput = z.object({
  subjects: z.string(),
  examDate: z.string().optional(),
  dailyHours: z.number().min(1).max(16),
});

export const aiPlanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => PlannerInput.parse(v))
  .handler(async ({ data }) => {
    const prompt = `Create a smart study plan. Subjects: ${data.subjects}. Exam date: ${data.examDate ?? "not set"}. Daily hours: ${data.dailyHours}. Return STRICT JSON: { "weekly": [{"day":"Monday","blocks":[{"time":"9:00-10:30","subject":"..","goal":".."}]}, ...7 days...], "dailyGoals": ["..","..",".."], "tips": ["..",".."]}. JSON only.`;
    const { text } = await generateText({ model: getModel(), prompt });
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return { weekly: [], dailyGoals: [], tips: [cleaned] };
    }
  });

const FlashcardInput = z.object({ topic: z.string().min(2), count: z.number().default(10) });

export const aiFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => FlashcardInput.parse(v))
  .handler(async ({ data }) => {
    const prompt = `Generate ${data.count} high-quality flashcards for "${data.topic}". Return STRICT JSON array of {"question":"..","answer":".."}. JSON only, no markdown.`;
    const { text } = await generateText({ model: getModel(), prompt });
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      const arr = JSON.parse(cleaned);
      return { cards: Array.isArray(arr) ? arr : [] };
    } catch {
      return { cards: [] };
    }
  });

// ============= V3: Exam Mode =============
const ExamInput = z.object({
  topic: z.string().min(2),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  count: z.number().int().min(3).max(20).default(8),
  sourceText: z.string().optional(),
});

export const aiExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ExamInput.parse(v))
  .handler(async ({ data }) => {
    const src = data.sourceText ? `\n\nBASE MATERIAL:\n${data.sourceText.slice(0, 12000)}` : "";
    const prompt = `Generate a ${data.difficulty} difficulty mock exam on "${data.topic}" with ${data.count} multiple-choice questions. Cover a variety of subtopics. Return STRICT JSON:
{ "questions": [ { "topic":"subtopic name","question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"why this answer is correct" } ] }
Return JSON only, no markdown fences.${src}`;
    const { text } = await generateText({ model: getModel(), prompt });
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      const j = JSON.parse(cleaned);
      return { questions: Array.isArray(j.questions) ? j.questions : [] };
    } catch {
      return { questions: [] };
    }
  });

// ============= V3: Career Assistant =============
const CareerInput = z.object({
  mode: z.enum(["analyze", "cover_letter", "linkedin", "interview"]),
  resume: z.string().optional(),
  jobDescription: z.string().optional(),
  role: z.string().optional(),
});

export const aiCareer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => CareerInput.parse(v))
  .handler(async ({ data }) => {
    let prompt = "";
    if (data.mode === "analyze") {
      prompt = `You are an ATS (Applicant Tracking System) expert. Analyze this resume${data.jobDescription ? " against the job description" : ""}. Return STRICT JSON:
{ "atsScore": 0-100, "strengths": ["..."], "weaknesses": ["..."], "improvements": ["actionable rewrite tips"], "missingKeywords": ["..."], "summary": "2-sentence verdict" }
RESUME:
${(data.resume ?? "").slice(0, 12000)}
${data.jobDescription ? `\nJOB:\n${data.jobDescription.slice(0, 4000)}` : ""}
JSON only.`;
    } else if (data.mode === "cover_letter") {
      prompt = `Write a compelling, personalized cover letter for the role "${data.role ?? "the target role"}" using this resume. Keep it 3-4 short paragraphs, confident but genuine. Return plain markdown.
RESUME:\n${(data.resume ?? "").slice(0, 8000)}
${data.jobDescription ? `\nJOB:\n${data.jobDescription.slice(0, 3000)}` : ""}`;
    } else if (data.mode === "linkedin") {
      prompt = `Based on this resume, generate 5 punchy LinkedIn headline options (max 220 chars each). Return STRICT JSON: { "headlines": ["...", "..."] }. JSON only.
RESUME:\n${(data.resume ?? "").slice(0, 6000)}`;
    } else {
      prompt = `Generate 10 realistic interview questions for the role "${data.role ?? "software engineer"}", mixing behavioral, technical, and situational. For each provide a strong sample answer outline. Return STRICT JSON: { "questions": [ { "question":"...","type":"behavioral|technical|situational","sampleAnswer":"..." } ] }. JSON only.`;
    }
    const { text } = await generateText({ model: getModel(), prompt });
    if (data.mode === "cover_letter") return { content: text };
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return { raw: cleaned };
    }
  });

// ============= V5: Career Roadmap =============
const RoadmapInput = z.object({
  career: z.string().min(2),
  currentLevel: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  timeframeMonths: z.number().int().min(1).max(36).default(12),
});

export const aiRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => RoadmapInput.parse(v))
  .handler(async ({ data }) => {
    const prompt = `You are a senior career coach. Build a detailed learning roadmap to become a "${data.career}" in ${data.timeframeMonths} months, starting from ${data.currentLevel} level. Return STRICT JSON:
{
  "overview": "2-3 sentence intro",
  "phases": [
    { "title": "Phase 1: Foundations", "durationWeeks": 4, "skills": ["..."], "courses": [{"name":"..","provider":".."}], "certifications": ["..."], "projects": ["..."], "milestone": "what you'll be able to do" }
  ],
  "topSkills": ["..."],
  "salaryRange": "e.g. $60k-$95k in the US",
  "tips": ["..."]
}
Provide 4-6 phases covering the full timeframe. JSON only, no markdown.`;
    const { text } = await generateText({ model: getModel(), prompt });
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return { overview: cleaned, phases: [], topSkills: [], salaryRange: "", tips: [] };
    }
  });

// ============= V5: Resume Builder =============
const ResumeBuildInput = z.object({
  fullName: z.string().min(1),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.string().optional(),
  targetRole: z.string().optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
  skills: z.string().optional(),
  projects: z.string().optional(),
});

export const aiResumeBuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ResumeBuildInput.parse(v))
  .handler(async ({ data }) => {
    const prompt = `You are an ATS-optimized resume writer. Build a strong, keyword-rich resume for the target role "${data.targetRole ?? "the applicant's field"}". Rewrite the user's raw inputs into concise, action-verb bullet points with quantified impact where possible. Return STRICT JSON:
{
  "summary": "3-4 line professional summary tailored to the target role",
  "skills": ["8-14 skills"],
  "experience": [{ "role":"..","company":"..","dates":"..","bullets":["3-5 STAR bullets"] }],
  "projects": [{ "name":"..","stack":"..","bullets":["2-3 bullets"] }],
  "education": [{ "degree":"..","school":"..","dates":".." }],
  "atsScore": 0-100,
  "atsTips": ["3-5 improvement tips"]
}
JSON only, no markdown.

USER DATA:
${JSON.stringify(data).slice(0, 8000)}`;
    const { text } = await generateText({ model: getModel(), prompt });
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return {
        summary: cleaned,
        skills: [],
        experience: [],
        projects: [],
        education: [],
        atsScore: 0,
        atsTips: [],
      };
    }
  });

// ============= V5: Mock Interview =============
const MockInterviewInput = z.object({
  action: z.enum(["start", "feedback"]),
  role: z.string().min(1),
  type: z.enum(["hr", "technical", "mixed"]).default("mixed"),
  count: z.number().int().min(3).max(12).default(6),
  qa: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
});

export const aiMockInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => MockInterviewInput.parse(v))
  .handler(async ({ data }) => {
    if (data.action === "start") {
      const prompt = `Generate ${data.count} realistic ${data.type} interview questions for a "${data.role}" role. Mix easy/medium/hard. Return STRICT JSON: { "questions": ["...", "..."] }. JSON only.`;
      const { text } = await generateText({ model: getModel(), prompt });
      const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
      try {
        const j = JSON.parse(cleaned);
        return { questions: Array.isArray(j.questions) ? j.questions : [] };
      } catch {
        return { questions: [] };
      }
    }
    const transcript = (data.qa ?? [])
      .map((x, i) => `Q${i + 1}: ${x.question}\nA${i + 1}: ${x.answer || "(no answer)"}`)
      .join("\n\n");
    const prompt = `You are a hiring manager evaluating a mock interview for "${data.role}". For EACH answer, grade 0-10 and give one-line feedback. Then produce an overall score and top improvements. Return STRICT JSON:
{
  "perQuestion": [{ "score": 0-10, "feedback": "..." }],
  "overallScore": 0-100,
  "strengths": ["..."],
  "improvements": ["..."],
  "verdict": "1-2 sentence summary"
}
JSON only, no markdown.

TRANSCRIPT:
${transcript}`;
    const { text } = await generateText({ model: getModel(), prompt });
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return {
        perQuestion: [],
        overallScore: 0,
        strengths: [],
        improvements: [],
        verdict: cleaned,
      };
    }
  });

// ============= V3: AI Tutor =============
const TutorInput = z.object({
  concept: z.string().min(2),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
});

export const aiTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => TutorInput.parse(v))
  .handler(async ({ data }) => {
    const prompt = `You are a world-class tutor. Explain "${data.concept}" for a ${data.level} learner. Structure the response as markdown with these sections in order:
## Simple Explanation
(2-3 sentences, plain language)
## Step-by-Step
(numbered breakdown)
## Real-World Example
(concrete relatable example)
## Diagram
Provide ONE mermaid diagram inside a fenced block \`\`\`mermaid ... \`\`\` that visualizes the concept (flowchart TD or sequenceDiagram).
## Common Pitfalls
(3 bullets)
## Check Your Understanding
(2 quick questions with answers)`;
    const { text } = await generateText({ model: getModel(), prompt });
    return { content: text };
  });

// ============= V3: AI Insights =============
const InsightsInput = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string(),
        status: z.string(),
        priority: z.string().optional(),
        due_date: z.string().nullable().optional(),
      }),
    )
    .default([]),
  events: z
    .array(
      z.object({ title: z.string(), event_type: z.string().optional(), event_date: z.string() }),
    )
    .default([]),
  stats: z.object({ xp: z.number(), level: z.number(), current_streak: z.number() }).optional(),
  focusMinutes: z.number().optional(),
  notesCount: z.number().optional(),
});

export const aiInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => InsightsInput.parse(v))
  .handler(async ({ data }) => {
    const prompt = `You are a productivity coach. Given the student's activity below, produce STRICT JSON:
{ "recommendations": ["3-5 short, specific, actionable tips"], "atRiskDeadlines": ["titles of tasks/events likely to be missed"], "weakSubjects": ["subjects/topics that need more attention"], "dailyGoal": "one crisp goal for today", "motivationalNote": "one sentence" }
JSON only, no markdown.

DATA:
${JSON.stringify(data).slice(0, 8000)}`;
    const { text } = await generateText({ model: getModel(), prompt });
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return {
        recommendations: [],
        atRiskDeadlines: [],
        weakSubjects: [],
        dailyGoal: "",
        motivationalNote: cleaned,
      };
    }
  });
