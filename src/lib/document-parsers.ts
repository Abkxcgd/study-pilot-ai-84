// Client-side document parsers for PDF, DOCX, and images (OCR).
// All are lazy-loaded to keep the initial bundle small.

export async function parsePdf(file: File, onProgress?: (p: number) => void): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    out += text + "\n\n";
    onProgress?.(i / doc.numPages);
  }
  return out.trim();
}

export async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value.trim();
}

export async function parseImage(file: File, onProgress?: (p: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(m.progress);
    },
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

export async function parseAny(
  file: File,
  onProgress?: (p: number) => void,
): Promise<{ text: string; kind: "pdf" | "docx" | "image" | "text" }> {
  const name = file.name.toLowerCase();
  const type = file.type;
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return { text: await parsePdf(file, onProgress), kind: "pdf" };
  }
  if (name.endsWith(".docx") || type.includes("wordprocessingml")) {
    return { text: await parseDocx(file), kind: "docx" };
  }
  if (type.startsWith("image/")) {
    return { text: await parseImage(file, onProgress), kind: "image" };
  }
  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
    return { text: await file.text(), kind: "text" };
  }
  throw new Error("Unsupported file type. Try PDF, DOCX, TXT, or image.");
}
