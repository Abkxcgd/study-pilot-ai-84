import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Check your email to confirm.");
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error("Google sign-in failed");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold">StudyPilot <span className="text-gradient">AI</span></span>
        </Link>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="space-y-3 mt-6">
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button onClick={signIn} disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 mt-6">
            <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Student" /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars" /></div>
            <Button onClick={signUp} disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
            </Button>
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />OR<div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" onClick={google} className="w-full">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continue with Google
        </Button>

        <Button
          variant="ghost"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const demoEmail = `demo+${Math.random().toString(36).slice(2, 10)}@studypilot.app`;
              const demoPass = `Demo!${Math.random().toString(36).slice(2, 12)}`;
              const { error } = await supabase.auth.signUp({
                email: demoEmail,
                password: demoPass,
                options: { data: { full_name: "Demo Student" } },
              });
              if (error) throw error;
              // Ensure a session (some projects require sign-in after sign-up)
              if (!(await supabase.auth.getSession()).data.session) {
                await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
              }
              const { seedDemoData } = await import("@/lib/demo-seed");
              await seedDemoData();
              toast.success("Demo account ready with sample data!");
              navigate({ to: "/dashboard" });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Demo mode failed");
            } finally {
              setLoading(false);
            }
          }}
          className="mt-2 w-full text-primary-glow hover:text-primary"
        >
          ✨ Try Instant Demo (no signup)
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </div>
  );
}
