import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame, Crown, Medal } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/leaderboard")({ component: LeaderboardPage });

function LeaderboardPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await supabase.from("leaderboard").select("*")).data ?? [],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-7 w-7 text-warning" /> Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">Top scholars this season. Earn XP to climb.</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {isLoading && <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>}
        {!isLoading && rows.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No scholars yet — be the first!
          </div>
        )}
        <ul>
          {rows.map((r, i) => (
            <motion.li
              key={r.user_id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-4 px-5 py-3 border-b border-border/30 last:border-0 ${
                i < 3 ? "bg-gradient-to-r from-warning/5 to-transparent" : ""
              }`}
            >
              <div className="w-8 text-center">
                {i === 0 ? (
                  <Crown className="h-5 w-5 mx-auto text-warning" />
                ) : i === 1 ? (
                  <Medal className="h-5 w-5 mx-auto text-muted-foreground" />
                ) : i === 2 ? (
                  <Medal className="h-5 w-5 mx-auto text-orange-500" />
                ) : (
                  <span className="text-sm text-muted-foreground">#{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{r.display_name}</div>
                <div className="text-xs text-muted-foreground">Level {r.level}</div>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                {r.current_streak}
              </div>
              <div className="font-bold tabular-nums text-primary-glow min-w-16 text-right">
                {r.xp} XP
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
