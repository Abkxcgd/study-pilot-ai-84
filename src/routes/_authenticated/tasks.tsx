import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ListChecks, GripVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({ component: TasksPage });

const columns = [
  { key: "todo", label: "To Do", color: "text-muted-foreground" },
  { key: "in_progress", label: "In Progress", color: "text-accent" },
  { key: "done", label: "Done", color: "text-success" },
] as const;

function TasksPage() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await supabase.from("tasks").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "" });

  const create = async () => {
    if (!form.title) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("tasks").insert({
      ...form, due_date: form.due_date || null, user_id: u.user!.id, status: "todo",
    });
    if (error) return toast.error(error.message);
    toast.success("Task added");
    setOpen(false); setForm({ title: "", description: "", priority: "medium", due_date: "" });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const move = async (id: string, status: string) => {
    const prev = tasks.find((t) => t.id === id);
    await supabase.from("tasks").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
    if (status === "done" && prev && prev.status !== "done") {
      const { awardXp, XP } = await import("@/lib/gamification");
      await awardXp(XP.TASK_DONE, "Task complete");
    }
  };
  const del = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const onDrop = (e: React.DragEvent, status: string) => {
    const id = e.dataTransfer.getData("id");
    if (id) move(id, status);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ListChecks className="h-7 w-7 text-primary-glow" /> To-Do Board</h1>
          <p className="text-muted-foreground mt-1">Drag & drop tasks across columns. Set priorities and deadlines.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-accent"><Plus className="mr-2 h-4 w-4" />New task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <Button onClick={create} className="w-full bg-gradient-to-r from-primary to-accent">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => (
          <div key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.key)}
            className="glass rounded-2xl p-4 min-h-96"
          >
            <div className={`text-sm font-semibold mb-3 ${col.color}`}>{col.label} · {tasks.filter((t: any) => t.status === col.key).length}</div>
            <div className="space-y-2">
              {tasks.filter((t: any) => t.status === col.key).map((t: any) => (
                <div key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("id", t.id)}
                  className="glass rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-primary/40"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t.title}</div>
                      {t.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>}
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className={`rounded px-1.5 py-0.5 ${
                          t.priority === "high" ? "bg-destructive/20 text-destructive" :
                          t.priority === "medium" ? "bg-warning/20 text-warning" : "bg-muted"
                        }`}>{t.priority}</span>
                        {t.due_date && <span className="text-muted-foreground">{new Date(t.due_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <button onClick={() => del(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
              {tasks.filter((t: any) => t.status === col.key).length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">Drop tasks here</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
