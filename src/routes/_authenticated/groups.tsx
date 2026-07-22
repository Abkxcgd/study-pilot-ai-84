import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, LogIn, Copy, Send, ArrowLeft, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyGroups,
  createGroup,
  joinByCode,
  leaveGroup,
  listMessages,
  sendMessage,
  listMembers,
  type StudyGroup,
  type GroupMessage,
} from "@/lib/groups";

export const Route = createFileRoute("/_authenticated/groups")({ component: GroupsPage });

function GroupsPage() {
  const [active, setActive] = useState<StudyGroup | null>(null);
  const qc = useQueryClient();
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: listMyGroups,
  });

  if (active) return <GroupRoom group={active} onBack={() => setActive(null)} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Study Groups
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn together — invite friends, chat in real time, share momentum.
          </p>
        </div>
        <div className="flex gap-2">
          <JoinDialog onJoined={() => qc.invalidateQueries({ queryKey: ["groups"] })} />
          <CreateDialog onCreated={() => qc.invalidateQueries({ queryKey: ["groups"] })} />
        </div>
      </div>

      {isLoading ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : groups.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center space-y-3">
          <Sparkles className="h-8 w-8 mx-auto text-primary" />
          <p className="text-muted-foreground">
            No groups yet. Create one, or join a friend's group with an invite code.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setActive(g)}
              className="glass hover-lift rounded-2xl p-5 text-left"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-mono">
                  {g.invite_code}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-lg line-clamp-1">{g.name}</h3>
              {g.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{g.description}</p>
              )}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createGroup(name.trim(), desc.trim() || undefined);
      toast.success("Group created");
      setOpen(false);
      setName("");
      setDesc("");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a study group</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            placeholder="What are you studying?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? "Creating…" : "Create group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JoinDialog({ onJoined }: { onJoined: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!code.trim()) return;
    setSaving(true);
    try {
      const g = await joinByCode(code);
      toast.success(`Joined ${g.name}`);
      setOpen(false);
      setCode("");
      onJoined();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LogIn className="mr-2 h-4 w-4" /> Join
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join with invite code</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="e.g. A1B2C3D4"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono tracking-widest text-center"
          />
          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? "Joining…" : "Join group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupRoom({ group, onBack }: { group: StudyGroup; onBack: () => void }) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState("");
  const [members, setMembers] = useState<number>(0);
  const [me, setMe] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? ""));
    listMessages(group.id).then(setMessages);
    listMembers(group.id).then((m) => setMembers(m.length));
    const channel = supabase
      .channel(`group:${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "study_group_messages",
          filter: `group_id=eq.${group.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as GroupMessage]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = input.trim();
    if (!body) return;
    setInput("");
    try {
      await sendMessage(group.id, body);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(group.invite_code);
    toast.success("Invite code copied");
  };

  const leave = async () => {
    if (!confirm(`Leave ${group.name}?`)) return;
    await leaveGroup(group.id);
    toast.success("Left group");
    onBack();
  };

  return (
    <div className="mx-auto max-w-4xl flex flex-col h-[calc(100vh-8rem)]">
      <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{group.name}</h2>
            <p className="text-xs text-muted-foreground">
              {members} member{members === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyCode}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            <span className="font-mono">{group.invite_code}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={leave}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 mt-4 glass rounded-2xl p-4 overflow-y-auto space-y-2"
      >
        {messages.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            Say hi to your study buddies 👋
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const mine = m.user_id === me;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      mine
                        ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                        : "bg-muted/50 border border-border/50"
                    }`}
                  >
                    {!mine && (
                      <div className="text-[10px] text-muted-foreground font-mono mb-0.5">
                        {m.user_id.slice(0, 8)}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-4 flex gap-2"
      >
        <Input
          placeholder="Message the group…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
