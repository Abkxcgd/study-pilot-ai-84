import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const inbound = await request.formData();
        const file = inbound.get("file");
        if (!(file instanceof File)) {
          return new Response("file field is required", { status: 400 });
        }
        if (file.size < 2048) {
          return new Response("Recording too short. Please try again.", { status: 400 });
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-transcribe");
        // Preserve extension so provider infers container correctly
        upstream.append("file", file, file.name || "recording.wav");

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          return new Response(text || "Transcription failed", { status: resp.status });
        }
        const json = (await resp.json()) as { text?: string };
        return Response.json({ text: json.text ?? "" });
      },
    },
  },
});
