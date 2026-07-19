import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, MicOff, Loader2, Sparkles, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { aiSummarize } from "@/lib/ai.functions";
import { awardXp, XP } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/voice-notes")({ component: VoiceNotesPage });

// Encode Float32 PCM to a WAV Blob (16-bit mono)
function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const pcm = new Int16Array(total);
  let off = 0;
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++) {
      const s = Math.max(-1, Math.min(1, c[i]));
      pcm[off++] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
  }
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  new Int16Array(buffer, 44).set(pcm);
  return new Blob([buffer], { type: "audio/wav" });
}

function VoiceNotesPage() {
  const summarize = useServerFn(aiSummarize);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<{ summary?: string; keyPoints?: string[] } | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmRef = useRef<Float32Array[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = proc;
      pcmRef.current = [];
      proc.onaudioprocess = (e) => {
        pcmRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(proc);
      proc.connect(ctx.destination);
      setRecording(true);
    } catch (e) {
      toast.error("Microphone access denied");
    }
  };

  const stop = async () => {
    setRecording(false);
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      const ctx = ctxRef.current;
      const sampleRate = ctx?.sampleRate ?? 44100;
      const blob = encodeWav(pcmRef.current, sampleRate);
      await ctx?.close();
      if (blob.size < 4096) return toast.error("Recording was empty. Try again.");
      setTranscribing(true);
      const form = new FormData();
      form.append("file", blob, "recording.wav");
      const resp = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!resp.ok) throw new Error(await resp.text());
      const json = (await resp.json()) as { text: string };
      setTranscript(json.text);
      toast.success("Transcribed!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transcription failed";
      toast.error(msg);
    } finally {
      setTranscribing(false);
    }
  };

  const doSummarize = async () => {
    if (transcript.trim().length < 30) return toast.error("Recording too short to summarize");
    setSummarizing(true);
    try {
      const r = await summarize({ data: { text: transcript, title: title || "Voice note" } });
      setSummary(r as { summary?: string; keyPoints?: string[] });
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("notes").insert({
          user_id: u.user.id,
          title: title || "Voice note",
          source_text: transcript.slice(0, 5000),
          summary: (r as { summary?: string }).summary ?? null,
          key_points: (r as { keyPoints?: string[] }).keyPoints ?? [],
        });
      }
      await awardXp(XP.VOICE_NOTE, "Voice note");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(msg);
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mic className="h-7 w-7 text-primary-glow" /> Voice Notes
        </h1>
        <p className="text-muted-foreground mt-1">
          Record a lecture or thought and let AI transcribe & summarize it.
        </p>
      </div>

      <div className="glass rounded-2xl p-8 text-center">
        <button
          onClick={recording ? stop : start}
          disabled={transcribing}
          className={`inline-grid h-28 w-28 place-items-center rounded-full transition ${
            recording
              ? "bg-destructive/20 border-2 border-destructive animate-pulse"
              : "bg-gradient-to-br from-primary to-accent"
          }`}
        >
          {transcribing ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : recording ? (
            <MicOff className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </button>
        <div className="mt-4 text-sm text-muted-foreground">
          {transcribing
            ? "Transcribing…"
            : recording
              ? "Recording… tap to stop"
              : "Tap to start recording"}
        </div>
      </div>

      {transcript && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea rows={8} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          <div className="flex gap-2">
            <Button
              onClick={doSummarize}
              disabled={summarizing}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {summarizing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Summarize & Save
            </Button>
          </div>
        </div>
      )}

      {summary && (
        <div className="glass rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Save className="h-4 w-4" /> Saved to your notes
          </div>
          <p className="leading-relaxed">{summary.summary}</p>
          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {summary.keyPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
