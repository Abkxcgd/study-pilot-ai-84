import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock jspdf and docx before importing exports
const saveSpy = vi.fn();
const textSpy = vi.fn();
vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 595 } },
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: textSpy,
    splitTextToSize: (t: string) => t.split("\n"),
    save: saveSpy,
  })),
}));

const packerSpy = vi.fn().mockResolvedValue(new Blob(["docx"]));
vi.mock("docx", () => ({
  Document: vi.fn(),
  Packer: { toBlob: packerSpy },
  Paragraph: vi.fn(),
  HeadingLevel: { TITLE: "Title" },
  TextRun: vi.fn(),
}));

import { exportPdf, exportDocx } from "@/lib/exports";

describe("exports", () => {
  beforeEach(() => {
    saveSpy.mockClear();
    textSpy.mockClear();
    packerSpy.mockClear();
    // stub URL and anchor
    (globalThis.URL as any).createObjectURL = vi.fn(() => "blob:x");
    (globalThis.URL as any).revokeObjectURL = vi.fn();
  });

  it("exportPdf calls save with sanitized filename", () => {
    exportPdf("My Notes! v2", "Hello body");
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const arg = saveSpy.mock.calls[0][0] as string;
    expect(arg).toMatch(/\.pdf$/);
    expect(arg).not.toMatch(/[!\s]/);
  });

  it("exportPdf writes title and body", () => {
    exportPdf("Title", "Body text");
    expect(textSpy).toHaveBeenCalled();
  });

  it("exportDocx generates a blob and triggers download", async () => {
    const clickSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });
    await exportDocx("Doc", "Para 1\n\nPara 2");
    expect(packerSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
