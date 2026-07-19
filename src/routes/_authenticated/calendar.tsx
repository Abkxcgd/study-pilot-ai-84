import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Plus, Timer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar")({ component: CalPage });

function CalPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", event_type: "exam" });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await supabase.from("events").select("*").order("event_date")).data ?? [],
  });

  const create = async () => {
    if (!form.title || !form.event_date) return toast.error("Title and date required");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("events").insert({ ...form, event_date: new Date(form.event_date).toISOString(), user_id: u.user!.id });
    if (error) return toast.error(error.message);
    toast.success("Event added");
    setOpen(false); setForm({ title: "", description: "", event_date: "", event_type: "exam" });
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  const upcoming = events.filter((e: any) => new Date(e.event_date) >= new Date()).slice(0, 5);
  const nextExam = upcoming.find((e: any) => e.event_type === "exam");
  const daysToExam = nextExam ? Math.max(0, Math.ceil((new Date(nextExam.event_date).getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><CalendarIcon className="h-7 w-7 text-primary-glow" /> Smart Calendar</h1>
          <p className="text-muted-foreground mt-1">Track exams, assignments, and study sessions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-primary to-accent"><Plus className="mr-2 h-4 w-4" />Add event</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date & time</Label><Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
                <div><Label>Type</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                    <option value="exam">Exam</option><option value="assignment">Assignment</option><option value="study">Study</option><option value="class">Class</option>
                  </select>
                </div>
              </div>
              <Button onClick={create} className="w-full bg-gradient-to-r from-primary to-accent">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {nextExam && (
        <div className="glass rounded-2xl p-5 flex items-center gap-4 glow">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent"><Timer className="h-6 w-6" /></div>
          <div>
            <div className="text-xs text-muted-foreground">Next exam countdown</div>
            <div className="text-lg font-semibold">{nextExam.title} — {daysToExam} days to go</div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{month.toLocaleString("default", { month: "long", year: "numeric" })}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}>‹</Button>
              <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}>›</Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={"e" + i} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(month.getFullYear(), month.getMonth(), day);
              const dayEvents = events.filter((e: any) => {
                const d = new Date(e.event_date);
                return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === day;
              });
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <div key={day} className={`aspect-square rounded-lg border border-border/30 p-1.5 text-xs ${isToday ? "bg-primary/20 border-primary" : "bg-white/5"}`}>
                  <div className={isToday ? "font-bold" : ""}>{day}</div>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e: any) => (
                      <div key={e.id} className="truncate rounded bg-accent/20 text-accent px-1 text-[10px]">{e.title}</div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events</p>}
            {upcoming.map((e: any) => (
              <div key={e.id} className="rounded-lg border border-border/40 p-3">
                <div className="text-xs text-accent">{e.event_type}</div>
                <div className="font-medium text-sm">{e.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.event_date).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
