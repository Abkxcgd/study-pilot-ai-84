import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3.5-flash";

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const gw = createLovableAiGatewayProvider(key);
  return gw(MODEL);
}

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
