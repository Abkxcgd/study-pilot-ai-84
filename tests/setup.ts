import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

// jsdom polyfills
if (!globalThis.matchMedia) {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error jsdom
globalThis.ResizeObserver = globalThis.ResizeObserver || RO;
// @ts-expect-error jsdom
globalThis.IntersectionObserver = globalThis.IntersectionObserver || RO;

// jsdom lacks scrollIntoView
if (typeof window !== "undefined") {
  (window.HTMLElement.prototype as any).scrollIntoView = function () {};
  (window.Element.prototype as any).scrollIntoView = function () {};
}
