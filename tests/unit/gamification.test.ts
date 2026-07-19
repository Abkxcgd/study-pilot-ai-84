import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
    auth: { getUser: () => getUserMock() },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { awardXp, XP, BADGE_LABELS } from "@/lib/gamification";

describe("gamification", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    getUserMock.mockReset();
  });

  it("XP constants are positive integers", () => {
    Object.values(XP).forEach((v) => {
      expect(v).toBeGreaterThan(0);
      expect(Number.isInteger(v)).toBe(true);
    });
  });

  it("exposes badge labels map", () => {
    expect(Object.keys(BADGE_LABELS).length).toBeGreaterThan(0);
    expect(BADGE_LABELS.first_step).toBeTruthy();
  });

  it("awardXp returns null on rpc error", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: new Error("bad") });
    const result = await awardXp(10);
    expect(result).toBeNull();
  });

  it("awardXp returns stats and checks badges on success", async () => {
    const stats = { xp: 20, level: 1, current_streak: 1, longest_streak: 1 };
    rpcMock.mockResolvedValueOnce({ data: stats, error: null });
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ data: [] }),
    });
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    fromMock.mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({}) });

    const result = await awardXp(20, "test");
    expect(result).toEqual(stats);
    expect(rpcMock).toHaveBeenCalledWith("award_xp", { _points: 20 });
  });
});
