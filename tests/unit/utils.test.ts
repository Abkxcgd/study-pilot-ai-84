import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (className merger)", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("handles conditional falsy values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });
  it("dedupes conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("merges arrays and objects", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });
});
