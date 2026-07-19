import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  saveSpy: vi.fn(),
  textSpy: vi.fn(),
  packerSpy: vi.fn(),
}));

vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 595 } },
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: mocks.textSpy,
    splitTextToSize: (t: string) => t.split("\n"),
    save: mocks.saveSpy,
  })),
}));

vi.mock("docx", () => ({
  Document: vi.fn(),
  Packer: { toBlob: mocks.packerSpy },
  Paragraph: vi.fn(),
  HeadingLevel: { TITLE: "Title" },
  TextRun: vi.fn(),
}));

import { exportPdf, exportDocx } from "@/lib/exports";

describe("exports", () => {
  beforeEach(() => {
    mocks.saveSpy.mockClear();
    mocks.textSpy.mockClear();
    mocks.packerSpy.mockReset();
    mocks.packerSpy.mockResolvedValue(new Blob(["docx"]));
    (globalThis.URL as any).createObjectURL = vi.fn(() => "blob:x");
    (globalThis.URL as any).revokeObjectURL = vi.fn();
  });

  it("exportPdf calls save with sanitized filename", () => {
    exportPdf("My Notes! v2", "Hello body");
    expect(mocks.saveSpy).toHaveBeenCalledTimes(1);
    const arg = mocks.saveSpy.mock.calls[0][0] as string;
    expect(arg).toMatch(/\.pdf$/);
    expect(arg).not.toMatch(/[!\s]/);
  });

  it("exportPdf writes title and body", () => {
    exportPdf("Title", "Body text");
    expect(mocks.textSpy).toHaveBeenCalled();
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
    expect(mocks.packerSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
