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
      .map((m: { source_type: string; content: string }, i: number) => `[#${i + 1} ${m.source_type}] ${m.content}`)
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
  messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() })),
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
