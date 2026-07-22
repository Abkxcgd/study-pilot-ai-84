import { subDays, startOfDay, format } from "date-fns";
import { useMemo } from "react";

type Session = { duration_minutes: number | null; completed_at: string };

export function StudyHeatmap({ sessions, days = 91 }: { sessions: Session[]; days?: number }) {
  const { cells, weeks, max } = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const k = s.completed_at.slice(0, 10);
      map.set(k, (map.get(k) ?? 0) + (s.duration_minutes ?? 0));
    }
    const today = startOfDay(new Date());
    const cells: { key: string; date: Date; mins: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const key = d.toISOString().slice(0, 10);
      cells.push({ key, date: d, mins: map.get(key) ?? 0 });
    }
    const max = Math.max(30, ...cells.map((c) => c.mins));
    // group into weeks (columns)
    const weeks: (typeof cells)[] = [];
    let cur: typeof cells = [];
    cells.forEach((c) => {
      cur.push(c);
      if (c.date.getDay() === 6) {
        weeks.push(cur);
        cur = [];
      }
    });
    if (cur.length) weeks.push(cur);
    return { cells, weeks, max };
  }, [sessions, days]);

  const level = (m: number) => {
    if (m <= 0) return 0;
    const r = m / max;
    if (r < 0.15) return 1;
    if (r < 0.35) return 2;
    if (r < 0.6) return 3;
    return 4;
  };
  const bg = [
    "bg-white/5",
    "bg-primary/20",
    "bg-primary/40",
    "bg-primary/60",
    "bg-gradient-to-br from-primary to-accent",
  ];

  const totalMins = cells.reduce((s, c) => s + c.mins, 0);
  const activeDays = cells.filter((c) => c.mins > 0).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {activeDays} active days · {(totalMins / 60).toFixed(1)}h total
        </span>
        <span className="flex items-center gap-1">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`h-3 w-3 rounded-sm ${bg[l]}`} />
          ))}
          More
        </span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-1">
            {w.map((c) => (
              <div
                key={c.key}
                title={`${format(c.date, "MMM d")}: ${c.mins} min`}
                className={`h-3 w-3 rounded-sm ${bg[level(c.mins)]}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
