import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiCleanHandwriting, aiIngest } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  PenLine,
  Camera,
  Upload,
  Sparkles,
  Loader2,
  Download,
  FileType,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { parseImage } from "@/lib/document-parsers";
import { exportPdf, exportDocx } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import { awardXp, XP } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/handwriting")({
  component: HandwritingPage,
});

type Result = {
  cleaned: string;
  title: string;
  summary: string;
  keyPoints: string[];
  corrections?: string[];
};

function HandwritingPage() {
  const clean = useServerFn(aiCleanHandwriting);
  const ingest = useServerFn(aiIngest);

  const [preview, setPreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [subject, setSubject] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const [camOpen, setCamOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const runOcr = async (file: File) => {
    setOcrRunning(true);
    setOcrProgress(0);
    setResult(null);
    setRawText("");
    setPreview(URL.createObjectURL(file));
    try {
      const text = await parseImage(file, (p) => setOcrProgress(p));
      if (!text || text.length < 8) {
        toast.error("Couldn't read handwriting. Try better lighting or a sharper photo.");
        return;
      }
      setRawText(text);
      toast.success(`Extracted ${text.length} characters`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "OCR failed");
    } finally {
      setOcrRunning(false);
      setOcrProgress(0);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOpen(true);
      // wait for element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      toast.error("Camera access denied");
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOpen(false);
  };

  const snap = async () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
    if (!blob) return;
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    closeCamera();
    await runOcr(file);
  };

  const runClean = async () => {
    if (rawText.trim().length < 8) return toast.error("Extract some text first");
    setCleaning(true);
    try {
      const r = (await clean({ data: { rawText, subject: subject || undefined } })) as Result;
      setResult(r);
      const { data: u } = await supabase.auth.getUser();
      let noteId: string | undefined;
      if (u.user) {
        const { data: inserted } = await supabase
          .from("notes")
          .insert({
            user_id: u.user.id,
            title: r.title || "Handwritten note",
            source_text: rawText.slice(0, 5000),
            summary: r.summary ?? null,
            key_points: r.keyPoints ?? [],
            flashcards: [],
            quiz: [],
          })
          .select("id")
          .single();
        noteId = inserted?.id;
      }
      await awardXp(XP.NOTE_SUMMARIZED, "Handwritten note digitized");
      ingest({
        data: {
          sourceType: "note",
          sourceId: noteId,
          title: r.title || "Handwritten note",
          content: `${r.summary ?? ""}\n\n${r.cleaned}`,
        },
      }).catch(() => {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cleanup failed");
    } finally {
      setCleaning(false);
    }
  };

  const exportBody = () => {
    if (!result) return "";
    let body = result.summary ? `SUMMARY\n\n${result.summary}\n\n` : "";
    if (result.keyPoints?.length)
      body += `KEY POINTS\n\n${result.keyPoints.map((p) => `• ${p}`).join("\n")}\n\n`;
    body += `NOTES\n\n${result.cleaned}\n`;
    if (result.corrections?.length)
      body += `\nOCR CORRECTIONS\n\n${result.corrections.map((c) => `• ${c}`).join("\n")}\n`;
    return body.trim();
  };

  const reset = () => {
    setPreview(null);
    setRawText("");
    setResult(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <PenLine className="h-7 w-7 text-primary-glow" /> Handwriting OCR
        </h1>
        <p className="text-muted-foreground mt-1">
          Snap or upload a photo of your handwritten notes. We&apos;ll read them, clean them up,
          and turn them into structured, searchable notes.
        </p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCamera} variant="outline">
            <Camera className="mr-2 h-4 w-4" /> Use camera
          </Button>
          <label className="glass rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:border-primary/40">
            <Upload className="h-4 w-4" /> Upload image
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && runOcr(e.target.files[0])}
            />
          </label>
          <Input
            placeholder="Subject (optional, e.g. Biology)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="max-w-xs"
          />
          {(preview || rawText) && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reset
            </Button>
          )}
        </div>

        {ocrRunning && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Reading handwriting…</div>
            <Progress value={ocrProgress * 100} />
          </div>
        )}

        {preview && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Source image</div>
              <img
                src={preview}
                alt="Handwritten source"
                className="w-full rounded-xl border border-border/40 max-h-80 object-contain bg-black/20"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Raw OCR text (editable — fix obvious mistakes before cleanup)
              </div>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={12}
                placeholder="Extracted text will appear here…"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={runClean}
            disabled={cleaning || ocrRunning || rawText.trim().length < 8}
            className="bg-gradient-to-r from-primary to-accent"
          >
            {cleaning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Clean up with AI
          </Button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">{result.title}</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportPdf(result.title || "notes", exportBody())}
              >
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportDocx(result.title || "notes", exportBody())}
              >
                <FileType className="mr-2 h-4 w-4" /> DOCX
              </Button>
            </div>
          </div>
          {result.summary && (
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-muted-foreground mb-1">Summary</div>
              <p className="leading-relaxed">{result.summary}</p>
            </div>
          )}
          {result.keyPoints?.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-muted-foreground mb-2">Key points</div>
              <ul className="space-y-1.5">
                {result.keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-primary-glow">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="glass rounded-2xl p-5">
            <div className="text-xs text-muted-foreground mb-2">Cleaned notes</div>
            <pre className="whitespace-pre-wrap font-sans leading-relaxed text-sm">
              {result.cleaned}
            </pre>
          </div>
          {result.corrections && result.corrections.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-muted-foreground mb-2">OCR corrections applied</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {result.corrections.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {camOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between p-4">
            <div className="font-semibold">Position notes in frame</div>
            <Button variant="ghost" size="icon" onClick={closeCamera} aria-label="Close camera">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <video
              ref={videoRef}
              className="max-h-full max-w-full rounded-xl border border-border/40"
              playsInline
              muted
            />
          </div>
          <div className="p-4 flex justify-center">
            <Button
              size="lg"
              onClick={snap}
              className="bg-gradient-to-r from-primary to-accent rounded-full h-16 w-16 p-0"
              aria-label="Capture"
            >
              <Camera className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
