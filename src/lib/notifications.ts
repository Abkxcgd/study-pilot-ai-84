import { supabase } from "@/integrations/supabase/client";

export type NotificationKind =
  | "task_due"
  | "event_soon"
  | "badge"
  | "streak"
  | "revision"
  | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  icon: string | null;
  read_at: string | null;
  created_at: string;
}

export async function pushNotification(input: {
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string;
  icon?: string;
  /** If provided, skip insert when a notification with the same (kind + dedupeKey) exists in the last N hours. */
  dedupeKey?: string;
  dedupeHours?: number;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;

  if (input.dedupeKey) {
    const since = new Date(
      Date.now() - (input.dedupeHours ?? 24) * 3600 * 1000,
    ).toISOString();
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", u.user.id)
      .eq("kind", input.kind)
      .ilike("title", input.title)
      .gte("created_at", since)
      .limit(1);
    if (existing && existing.length > 0) return null;
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: u.user.id,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      icon: input.icon ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error("pushNotification", error);
    return null;
  }
  return data as AppNotification;
}

export async function markAllRead() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", u.user.id)
    .is("read_at", null);
}

export async function markRead(id: string) {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
}

export async function clearAll() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("notifications").delete().eq("user_id", u.user.id);
}

/**
 * Scan tasks + events + streak and enqueue any reminders that fire today.
 * Idempotent via dedupeKey in title. Call on app load / dashboard mount.
 */
export async function runReminderScan() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const userId = u.user.id;

  // Tasks due within 24h and not done
  const in24h = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id,title,due_date,status")
    .eq("user_id", userId)
    .neq("status", "done")
    .not("due_date", "is", null)
    .lte("due_date", in24h)
    .gte("due_date", nowIso);
  for (const t of tasks ?? []) {
    await pushNotification({
      kind: "task_due",
      title: `Task due soon: ${t.title}`,
      body: t.due_date ? `Due ${new Date(t.due_date).toLocaleString()}` : undefined,
      link: "/tasks",
      icon: "ListChecks",
      dedupeKey: t.id,
      dedupeHours: 12,
    });
  }

  // Events within 48h
  const in48h = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  const { data: events } = await supabase
    .from("events")
    .select("id,title,event_type,event_date")
    .eq("user_id", userId)
    .gte("event_date", nowIso)
    .lte("event_date", in48h);
  for (const e of events ?? []) {
    await pushNotification({
      kind: "event_soon",
      title: `${e.event_type ?? "Event"} soon: ${e.title}`,
      body: `On ${new Date(e.event_date).toLocaleString()}`,
      link: "/calendar",
      icon: "Calendar",
      dedupeKey: e.id,
      dedupeHours: 24,
    });
  }

  // Streak nudge: if user hasn't been active today
  const { data: stats } = await supabase
    .from("user_stats")
    .select("current_streak,last_active_date")
    .maybeSingle();
  if (stats?.current_streak && stats.current_streak > 0) {
    const today = new Date().toISOString().slice(0, 10);
    if (stats.last_active_date !== today) {
      await pushNotification({
        kind: "streak",
        title: `Keep your ${stats.current_streak}-day streak alive 🔥`,
        body: "Log any activity today to protect your streak.",
        link: "/focus",
        icon: "Flame",
        dedupeKey: `streak-${today}`,
        dedupeHours: 20,
      });
    }
  }
}
