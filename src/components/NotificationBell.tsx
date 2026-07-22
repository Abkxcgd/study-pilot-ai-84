import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Trash2, ListChecks, Calendar, Flame, Award, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  markAllRead,
  markRead,
  clearAll,
  runReminderScan,
  type AppNotification,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ListChecks,
  Calendar,
  Flame,
  Award,
  Sparkles,
  Bell,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as AppNotification[];
    },
  });

  // Reminder scan on mount (once per session)
  useEffect(() => {
    let ran = false;
    if (ran) return;
    ran = true;
    runReminderScan().then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
  }, [qc]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const unread = notifs.filter((n) => !n.read_at).length;

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-border/50 bg-white/5 hover:bg-white/10 transition"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-to-br from-primary to-accent px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              aria-label="Close notifications"
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] glass rounded-2xl border border-border/60 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <div className="font-semibold text-sm">Notifications</div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={async () => {
                      await markAllRead();
                      qc.invalidateQueries({ queryKey: ["notifications"] });
                    }}
                  >
                    <Check className="mr-1 h-3 w-3" /> Read all
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={async () => {
                      await clearAll();
                      qc.invalidateQueries({ queryKey: ["notifications"] });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="max-h-[26rem] overflow-y-auto">
                {notifs.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
                    You're all caught up.
                  </div>
                )}
                {notifs.map((n) => {
                  const Icon = ICONS[n.icon ?? "Bell"] ?? Bell;
                  const body = (
                    <div
                      className={`flex gap-3 border-b border-border/30 px-4 py-3 transition ${
                        n.read_at ? "opacity-60" : "bg-primary/5"
                      } hover:bg-white/5`}
                    >
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/25 to-accent/10">
                        <Icon className="h-4 w-4 text-primary-glow" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-tight truncate">
                          {n.title}
                        </div>
                        {n.body && (
                          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {n.body}
                          </div>
                        )}
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                  return n.link ? (
                    <Link
                      key={n.id}
                      to={n.link}
                      onClick={async () => {
                        setOpen(false);
                        if (!n.read_at) {
                          await markRead(n.id);
                          qc.invalidateQueries({ queryKey: ["notifications"] });
                        }
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      key={n.id}
                      onClick={async () => {
                        if (!n.read_at) {
                          await markRead(n.id);
                          qc.invalidateQueries({ queryKey: ["notifications"] });
                        }
                      }}
                      className="w-full text-left"
                    >
                      {body}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
