// Lightweight spaced-repetition scheduler (SM-2 lite), persisted to localStorage.
export type SRSCard = {
  id: string; // stable id (topic + index)
  ease: number; // 1.3 - 2.8
  interval: number; // days
  reps: number;
  due: number; // epoch ms
  lapses: number;
};

const KEY = "studypilot.srs.v1";

function loadAll(): Record<string, SRSCard> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function saveAll(map: Record<string, SRSCard>) {
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(map));
}

export function getCard(id: string): SRSCard {
  const all = loadAll();
  return (
    all[id] ?? {
      id,
      ease: 2.3,
      interval: 0,
      reps: 0,
      due: Date.now(),
      lapses: 0,
    }
  );
}

export type Grade = "again" | "hard" | "good" | "easy";

export function reviewCard(id: string, grade: Grade): SRSCard {
  const all = loadAll();
  const c = all[id] ?? getCard(id);
  const q = grade === "again" ? 1 : grade === "hard" ? 3 : grade === "good" ? 4 : 5;

  if (q < 3) {
    c.reps = 0;
    c.interval = 0;
    c.lapses += 1;
  } else {
    if (c.reps === 0) c.interval = 1;
    else if (c.reps === 1) c.interval = 3;
    else c.interval = Math.round(c.interval * c.ease);
    c.reps += 1;
  }
  c.ease = Math.max(1.3, c.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  if (grade === "easy") c.interval = Math.round(c.interval * 1.3);
  c.due = Date.now() + Math.max(60_000, c.interval * 86_400_000);
  all[id] = c;
  saveAll(all);
  return c;
}

export function dueCount(ids: string[]): number {
  const all = loadAll();
  const now = Date.now();
  return ids.filter((id) => (all[id]?.due ?? 0) <= now).length;
}

export function formatDue(due: number): string {
  const diff = due - Date.now();
  if (diff <= 0) return "due now";
  const d = Math.round(diff / 86_400_000);
  if (d < 1) return "later today";
  if (d === 1) return "tomorrow";
  return `in ${d}d`;
}
