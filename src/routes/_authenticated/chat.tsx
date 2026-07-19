import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiChat } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Loader2, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({ component: ChatPage });

type Msg = { role: "user" | "assistant"; content: string };

const suggestions = [
  "Explain Big-O notation with examples",
  "Create a 7-day plan to prepare for a calculus exam",
  "Summarize the causes of World War I",
  "Give me 10 practice problems on recursion",
];

function ChatPage() {
  const chat = useServerFn(aiChat);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setLoading(true);
    try {
      const res = await chat({ data: { messages: next } });
      setMsgs([...next, { role: "assistant", content: res.text }]);
    } catch (e: any) {
      toast.error(e?.message ?? "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">AI Chat Assistant</h1>
          <p className="text-xs text-muted-foreground">Powered by Gemini · Ask anything academic</p>
        </div>
      </div>

      <div className="flex-1 glass rounded-2xl p-4 overflow-y-auto">
        {msgs.length === 0 && (
          <div className="grid h-full place-items-center">
            <div className="max-w-md text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary-glow" />
              <h2 className="mt-3 text-lg font-semibold">How can I help you study today?</h2>
              <div className="mt-6 grid gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="glass rounded-xl p-3 text-left text-sm hover:border-primary/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 py-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${m.role === "user" ? "bg-primary" : "bg-gradient-to-br from-accent to-primary"}`}
            >
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "glass"}`}
            >
              <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-black/40 [&_pre]:rounded-lg [&_code]:text-accent">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 py-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="glass rounded-2xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-4 glass rounded-2xl p-2 flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask StudyPilot AI anything… (Enter to send, Shift+Enter for newline)"
          className="min-h-11 resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <Button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          size="icon"
          className="bg-gradient-to-r from-primary to-accent"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
