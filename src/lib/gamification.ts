import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pushNotification } from "@/lib/notifications";

export const XP = {
  TASK_DONE: 10,
  NOTE_SUMMARIZED: 20,
  QUIZ_COMPLETED: 15,
  FLASHCARDS_GENERATED: 10,
  FOCUS_SESSION: 25,
  ASSIGNMENT_GENERATED: 15,
  VOICE_NOTE: 15,
} as const;

const BADGES: { key: string; label: string; check: (s: Stats) => boolean }[] = [
  { key: "first_step", label: "First Step", check: (s) => s.xp >= 10 },
  { key: "streak_7", label: "7-Day Streak", check: (s) => s.current_streak >= 7 },
  { key: "streak_30", label: "30-Day Scholar", check: (s) => s.current_streak >= 30 },
  { key: "level_5", label: "Rising Star", check: (s) => s.level >= 5 },
  { key: "level_10", label: "StudyPilot Pro", check: (s) => s.level >= 10 },
  { key: "xp_1000", label: "1000 XP Club", check: (s) => s.xp >= 1000 },
];

type Stats = {
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
};

export async function awardXp(points: number, reason?: string) {
  const { data, error } = await supabase.rpc("award_xp", { _points: points });
  if (error) {
    console.error("award_xp", error);
    return null;
  }
  const stats = data as Stats;
  toast.success(`+${points} XP${reason ? ` · ${reason}` : ""}`, {
    description: `Level ${stats.level} · ${stats.current_streak}🔥 streak`,
  });
  // Award any new badges
  const { data: existing } = await supabase.from("user_badges").select("badge_key");
  const owned = new Set((existing ?? []).map((b) => b.badge_key));
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return stats;
  const newBadges = BADGES.filter((b) => !owned.has(b.key) && b.check(stats));
  if (newBadges.length > 0) {
    await supabase
      .from("user_badges")
      .insert(newBadges.map((b) => ({ user_id: u.user!.id, badge_key: b.key })));
    newBadges.forEach((b) => toast.success(`🏆 Badge unlocked: ${b.label}`, { duration: 4000 }));
  }
  return stats;
}

export const BADGE_LABELS: Record<string, string> = Object.fromEntries(
  BADGES.map((b) => [b.key, b.label]),
);
