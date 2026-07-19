import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Timer, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { awardXp, XP } from "@/lib/gamification";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/focus")({ component: FocusPage });

type Mode = "work" | "short" | "long";
const durations: Record<Mode, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };

function FocusPage() {
  const [mode, setMode] = useState<Mode>("work");
  const [seconds, setSeconds] = useState(durations.work);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const beepRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (seconds !== 0 || !running) return;
    setRunning(false);
    playBeep();
    if (mode === "work") {
      recordSession(durations.work / 60);
      const next = (cycles + 1) % 4 === 0 ? "long" : "short";
      setCycles((c) => c + 1);
      switchMode(next);
    } else {
      toast.info("Break over — back to focus!");
      switchMode("work");
    }
  }, [seconds, running]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSeconds(durations[m]);
  };

  const playBeep = () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = beepRef.current || new AC();
      beepRef.current = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      o.start(); o.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  const recordSession = async (minutes: number) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("focus_sessions").insert({ user_id: u.user.id, duration_minutes: minutes });
    await awardXp(XP.FOCUS_SESSION, `${minutes}-min focus session`);
  };

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  const total = durations[mode];
  const pct = ((total - seconds) / total) * 100;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Timer className="h-7 w-7 text-primary-glow" /> Focus Timer
        </h1>
        <p className="text-muted-foreground mt-1">Pomodoro-style 25/5 sessions. Earn XP for every completed round.</p>
      </div>

      <div className="glass rounded-3xl p-8 sm:p-12 text-center">
        <div className="inline-flex rounded-full border border-border/40 p-1 mb-8 text-sm">
          {(["work", "short", "long"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setRunning(false); switchMode(m); }}
              className={`px-4 py-1.5 rounded-full transition ${
                mode === m ? "bg-gradient-to-r from-primary to-accent text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "work" ? "Focus" : m === "short" ? "Short break" : "Long break"}
            </button>
          ))}
        </div>

        <div className="relative mx-auto h-64 w-64 sm:h-80 sm:w-80">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" stroke="hsl(var(--border))" strokeWidth="4" fill="none" opacity="0.3" />
            <motion.circle
              cx="50" cy="50" r="46" fill="none"
              stroke="url(#focusGrad)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 46}
              strokeDashoffset={2 * Math.PI * 46 * (1 - pct / 100)}
              transition={{ ease: "linear" }}
            />
            <defs>
              <linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl sm:text-7xl font-bold tabular-nums">{mm}:{ss}</div>
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              {mode === "work" ? <Timer className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
              {mode === "work" ? "Deep focus" : "Take a breather"}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" onClick={() => setRunning((r) => !r)} className="bg-gradient-to-r from-primary to-accent min-w-32">
            {running ? <><Pause className="mr-2 h-4 w-4" /> Pause</> : <><Play className="mr-2 h-4 w-4" /> Start</>}
          </Button>
          <Button size="lg" variant="outline" onClick={() => { setRunning(false); setSeconds(durations[mode]); }}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
        <div className="mt-6 text-xs text-muted-foreground">Completed cycles today: <span className="text-foreground font-medium">{cycles}</span></div>
      </div>
    </div>
  );
}
