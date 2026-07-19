import { useEffect, useRef, useState } from "react";

let initialized = false;

export default function MermaidRenderer({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      if (!initialized) {
        mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict", fontFamily: "Inter, sans-serif" });
        initialized = true;
      }
      try {
        const id = `m${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Diagram error");
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (error) return <pre className="text-xs text-destructive">{error}\n\n{code}</pre>;
  return <div ref={ref} className="my-4 overflow-x-auto rounded-lg border border-border/40 bg-background/40 p-4" />;
}
