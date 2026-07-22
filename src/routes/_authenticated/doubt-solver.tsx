import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiDoubtSolver } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, HelpCircle, Sparkles, Upload, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/doubt-solver")({
  component: DoubtSolverPage,
});

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function compressImage(file: File, maxDim = 1280): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function DoubtSolverPage() {
  const run = useServerFn(aiDoubtSolver);
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState<"math" | "code" | "science" | "general">("general");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image");
    try {
      const url = await compressImage(file);
      setImage(url);
    } catch {
      toast.error("Couldn't read image");
    }
  };

  const solve = async () => {
    if (!question.trim() && !image) return toast.error("Add a question or upload an image");
    setLoading(true);
    setAnswer("");
    try {
      const r = (await run({
        data: {
          question: question || undefined,
          imageDataUrl: image || undefined,
          subject,
        },
      })) as { answer: string };
      setAnswer(r.answer);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">AI Doubt Solver</h1>
          <p className="text-sm text-muted-foreground">
            Snap a photo of a math problem, code screenshot, or diagram — get step-by-step answers.
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <Tabs value={subject} onValueChange={(v) => setSubject(v as typeof subject)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="math">Math</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="science">Science</TabsTrigger>
          </TabsList>
        </Tabs>

        <Textarea
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Describe your doubt (or leave blank and upload an image)"
        />

        {image && (
          <div className="relative inline-block">
            <img
              src={image}
              alt="doubt"
              className="max-h-64 rounded-lg border border-border/40"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -right-2 -top-2 h-6 w-6"
              onClick={() => setImage(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> {image ? "Replace image" : "Upload image"}
          </Button>
          <Button
            onClick={solve}
            disabled={loading}
            className="bg-gradient-to-r from-primary to-accent"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Solve
          </Button>
        </div>
      </div>

      {answer && (
        <div className="glass rounded-2xl p-6">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
