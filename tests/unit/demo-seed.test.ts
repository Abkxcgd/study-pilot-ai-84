import { describe, it, expect, vi } from "vitest";

const insertMock = vi.fn().mockResolvedValue({});
const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
const getUserMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: insertMock }),
    rpc: (...a: any[]) => rpcMock(...a),
    auth: { getUser: () => getUserMock() },
  },
}));

import { seedDemoData } from "@/lib/demo-seed";

describe("demo-seed", () => {
  it("throws if no user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    await expect(seedDemoData()).rejects.toThrow(/Not signed in/);
  });

  it("inserts tasks, events, notes and awards XP for signed-in user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    insertMock.mockClear();
    await seedDemoData();
    // 3 inserts (tasks, events, notes)
    expect(insertMock).toHaveBeenCalledTimes(3);
    // All rows carry user_id
    for (const call of insertMock.mock.calls) {
      const rows = call[0] as Array<{ user_id: string }>;
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((r) => expect(r.user_id).toBe("u1"));
    }
    expect(rpcMock).toHaveBeenCalledWith("award_xp", { _points: 250 });
  });
});
