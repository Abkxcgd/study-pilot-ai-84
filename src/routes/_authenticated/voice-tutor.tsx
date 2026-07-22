import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiVoiceTutor } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mic, MicOff, Volume2, VolumeX, Loader2, Radio, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/voice-tutor")({
  component: VoiceTutorPage,
  head: () => ({
    meta: [
      { title: "Voice Tutor — StudyPilot AI" },
      {
        name: "description",
        content:
          "Hands-free conversational AI tutor. Speak your question and hear an explanation back — perfect for revising on the go.",
      },
      { property: "og:title", content: "Voice Tutor — StudyPilot AI" },
      {
        property: "og:description",
        content: "Talk to an AI tutor. Ask, listen, learn — hands-free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Turn = { role: "user" | "assistant"; content: string };

// Browser Speech Recognition types (webkit prefix on most engines)
type AnySR = {
  new (): {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: (e: {
      results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean; length: number }>;
    }) => void;
    onerror: (e: { error?: string }) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
    abort: () => void;
  };
};

function getSR(): AnySR | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: AnySR; webkitSpeechRecognition?: AnySR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02;
  u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) =>
    /Google US English|Samantha|Jenny|Aria|Natural/i.test(v.name),
  );
  if (preferred) u.voice = preferred;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

function VoiceTutorPage() {
  const run = useServerFn(aiVoiceTutor);
  const [subject, setSubject] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState("");
  const recRef = useRef<InstanceType<AnySR> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const SR = getSR();
    if (!SR) setSupported(false);
    return () => {
      recRef.current?.abort?.();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, interim]);

  const ask = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const next: Turn[] = [...turns, { role: "user", content: clean }];
    setTurns(next);
    setInterim("");
    setThinking(true);
    try {
      const res = await run({
        data: {
          messages: next.slice(-8).map((t) => ({ role: t.role, content: t.content })),
          subject: subject.trim() || undefined,
        },
      });
      const reply = res.text.trim();
      setTurns((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!muted) {
        setSpeaking(true);
        speak(reply, () => setSpeaking(false));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tutor failed to respond");
    } finally {
      setThinking(false);
    }
  };

  const startListening = () => {
    const SR = getSR();
    if (!SR) return toast.error("Voice input not supported in this browser. Try Chrome.");
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";

    rec.onresult = (e) => {
      let interimT = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (r.isFinal) finalText += t + " ";
        else interimT += t;
      }
      setInterim(finalText + interimT);
    };
    rec.onerror = (e) => {
      if (e.error && e.error !== "no-speech" && e.error !== "aborted") {
        toast.error(`Mic error: ${e.error}`);
      }
    };
    rec.onend = () => {
      setListening(false);
      const said = finalText.trim();
      if (said) void ask(said);
      else setInterim("");
    };

    recRef.current = rec;
    setListening(true);
    setInterim("");
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stopListening = () => {
    recRef.current?.stop?.();
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const clearConversation = () => {
    setTurns([]);
    setInterim("");
    stopSpeaking();
    toast.success("Conversation cleared");
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (next) stopSpeaking();
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 page-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Voice Tutor</h1>
            <p className="text-sm text-muted-foreground">
              Hands-free. Speak your question, hear it explained.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-glow" />
          <Input
            placeholder="Optional: subject focus (e.g. calculus, world history)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-background/50"
          />
        </div>

        <div
          ref={scrollRef}
          className="h-[380px] overflow-y-auto rounded-xl border border-border/50 bg-background/30 p-4 space-y-3"
        >
          {turns.length === 0 && !interim && (
            <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              <div>
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-accent/20">
                  <Mic className="h-6 w-6" />
                </div>
                Tap the mic and ask anything — "explain photosynthesis", "quiz me on the French
                Revolution", "what's a derivative?"
              </div>
            </div>
          )}

          {turns.map((t, i) => (
            <div
              key={i}
              className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  t.role === "user"
                    ? "bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/30"
                    : "bg-background/60 border border-border/50"
                }`}
              >
                {t.content}
              </div>
            </div>
          ))}

          {interim && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-primary/10 border border-primary/20 text-muted-foreground italic">
                {interim}
              </div>
            </div>
          )}

          {thinking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking…
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!listening ? (
              <Button
                onClick={startListening}
                disabled={!supported || thinking}
                className="rounded-full bg-gradient-to-br from-primary to-accent hover-lift"
                size="lg"
              >
                <Mic className="mr-2 h-5 w-5" /> Hold to talk
              </Button>
            ) : (
              <Button
                onClick={stopListening}
                variant="destructive"
                size="lg"
                className="rounded-full animate-pulse"
              >
                <MicOff className="mr-2 h-5 w-5" /> Stop listening
              </Button>
            )}
            {speaking && (
              <Button variant="outline" size="sm" onClick={stopSpeaking}>
                <VolumeX className="mr-2 h-4 w-4" /> Stop voice
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {listening
                ? "Listening…"
                : speaking
                  ? "Speaking…"
                  : thinking
                    ? "Thinking…"
                    : "Idle"}
            </span>
            <Button variant="ghost" size="sm" onClick={clearConversation} disabled={!turns.length}>
              <Trash2 className="mr-1 h-4 w-4" /> Clear
            </Button>
          </div>
        </div>

        {!supported && (
          <p className="text-xs text-amber-400">
            Voice input isn't supported in this browser. Please use Chrome or Edge on desktop for
            the full experience.
          </p>
        )}
      </div>
    </div>
  );
}
