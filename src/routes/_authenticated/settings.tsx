import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, User, Bell, Shield, LogOut, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: Page });

function Page() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notif, setNotif] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user!.id)
        .maybeSingle();
      setName(p?.full_name ?? (u.user?.user_metadata?.full_name as string) ?? "");
    })();
  }, []);

  const save = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").upsert({ id: u.user!.id, full_name: name });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary-glow" /> Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile, notifications, and privacy.
        </p>
      </div>

      <Section icon={User} title="Profile">
        <div>
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>
        <Button
          onClick={save}
          disabled={loading}
          className="bg-gradient-to-r from-primary to-accent"
        >
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </Section>

      <Section icon={Bell} title="Notifications">
        <Row label="Email notifications" desc="Get task reminders and deadline alerts">
          <Switch checked={notif} onCheckedChange={setNotif} />
        </Row>
        <Row label="Push notifications" desc="Coming soon">
          <Switch disabled />
        </Row>
      </Section>

      <Section icon={Shield} title="Privacy & data">
        <p className="text-sm text-muted-foreground">
          Your notes, chats, and study data are private and encrypted. Only you can access them.
        </p>
        <Button variant="outline" onClick={signOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }: any) {
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary-glow" />
        {title}
      </h2>
      {children}
    </div>
  );
}
function Row({ label, desc, children }: any) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {children}
    </div>
  );
}
