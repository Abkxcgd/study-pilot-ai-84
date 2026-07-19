import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { aiChat } from "@/lib/ai.functions";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export function AskAiFab() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chat = useServerFn(aiChat);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = async () => {
    const content = input.trim();
    if (!content || loading) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setLoading(true);
    try {
      const res = await chat({ data: { messages: next } });
      setMsgs([...next, { role: "assistant", content: res.text }]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reach AI");
    } finally { setLoading(false); }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask AI (Ctrl/Cmd+K)"
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40 hover:scale-105 transition-transform glow"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 bg-background/40 backdrop-blur-sm animate-in fade-in" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass w-full sm:w-[420px] h-[80vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-primary-glow" /> Ask AI
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close"><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.length === 0 && (
                <div className="text-sm text-muted-foreground text-center mt-8">
                  <Bot className="mx-auto h-10 w-10 text-primary-glow mb-3" />
                  Ask anything — from a quick concept to a full study plan.
                  <div className="mt-4 text-xs opacity-70">Shortcut: Ctrl/Cmd + K</div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/20"><Bot className="h-3.5 w-3.5" /></div>}
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-gradient-to-r from-primary to-accent text-white" : "bg-white/5 border border-border/50"}`}>
                    {m.role === "assistant" ? <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{m.content}</ReactMarkdown></div> : m.content}
                  </div>
                  {m.role === "user" && <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/20"><User className="h-3.5 w-3.5" /></div>}
                </div>
              ))}
              {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</div>}
              <div ref={endRef} />
            </div>
            <div className="border-t border-border/50 p-3">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask anything…"
                  rows={1}
                  className="min-h-[40px] resize-none"
                />
                <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="bg-gradient-to-r from-primary to-accent shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
