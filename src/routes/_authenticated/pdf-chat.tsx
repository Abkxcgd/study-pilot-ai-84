import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiChat } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileSearch, Send, Loader2, Upload } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pdf-chat")({ component: Page });

type Msg = { role: "user" | "assistant"; content: string };

function Page() {
  const chat = useServerFn(aiChat);
  const [doc, setDoc] = useState("");
  const [docName, setDocName] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const onFile = async (file: File) => {
    if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      setDoc(await file.text());
      setDocName(file.name);
    } else {
      toast.info("Paste extracted text from your PDF/DOCX for now — direct parsing coming soon.");
    }
  };

  const ask = async () => {
    if (!doc.trim()) return toast.error("Add a document first");
    if (!input.trim() || loading) return;
    const q = input;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setLoading(true);
    try {
      const res = await chat({
        data: {
          system: `You are an expert assistant. Answer strictly based on this document. If the answer isn't in the document, say so.\n\nDOCUMENT:\n${doc.slice(0, 30000)}`,
          messages: next,
        },
      });
      setMsgs([...next, { role: "assistant", content: res.text }]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileSearch className="h-7 w-7 text-primary-glow" /> PDF Chat
        </h1>
        <p className="text-muted-foreground mt-1">Paste a document and ask questions about it.</p>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Document title"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />
          <label className="glass rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:border-primary/40 whitespace-nowrap">
            <Upload className="h-4 w-4" /> Upload .txt
            <input
              type="file"
              accept=".txt,.md,text/*"
              hidden
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
        </div>
        <Textarea
          rows={6}
          placeholder="Paste your document text here…"
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
        />
        <div className="text-xs text-muted-foreground">{doc.length} chars loaded</div>
      </div>

      <div className="glass rounded-2xl p-4 min-h-64 max-h-96 overflow-y-auto">
        {msgs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            Ask any question about your document
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`py-2 ${m.role === "user" ? "text-right" : ""}`}>
            <div
              className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left ${m.role === "user" ? "bg-primary text-primary-foreground" : "glass"}`}
            >
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="glass rounded-2xl p-2 flex gap-2">
        <Textarea
          rows={1}
          placeholder="Ask about the document…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          className="min-h-11 resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <Button
          onClick={ask}
          disabled={loading}
          size="icon"
          className="bg-gradient-to-r from-primary to-accent"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
