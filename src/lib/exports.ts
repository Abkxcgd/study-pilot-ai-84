// Client-side document exporters. PDF via jsPDF, DOCX via docx.
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportPdf(title: string, body: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, margin, margin);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(body, width);
  doc.text(lines, margin, margin + 30);
  doc.save(`${sanitize(title)}.pdf`);
}

export async function exportDocx(title: string, body: string) {
  const paragraphs = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, bold: true })],
    }),
    ...body.split(/\n{2,}/).map(
      (chunk) =>
        new Paragraph({
          children: [new TextRun({ text: chunk.replace(/\n/g, " ") })],
        }),
    ),
  ];
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  download(blob, `${sanitize(title)}.docx`);
}

function sanitize(s: string) {
  return (s || "document").replace(/[^\w-]+/g, "_").slice(0, 60);
}
