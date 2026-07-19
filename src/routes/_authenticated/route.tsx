import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, MessageSquare, FileText, BookOpen, Calendar as CalendarIcon,
  ListChecks, Layers, BarChart3, Settings, GraduationCap, LogOut, Menu, X, FileSearch, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/notes", label: "Notes Summarizer", icon: FileText },
  { to: "/assignments", label: "Assignments", icon: BookOpen },
  { to: "/planner", label: "Study Planner", icon: CalendarClock },
  { to: "/tasks", label: "To-Do Board", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarIcon },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/pdf-chat", label: "PDF Chat", icon: FileSearch },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthedLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const location = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl transition-transform`}>
        <div className="flex h-full flex-col p-4">
          <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-semibold">StudyPilot <span className="text-gradient">AI</span></span>
          </Link>
          <nav className="mt-6 flex flex-col gap-1">
            {nav.map((item) => {
              const active = location.startsWith(item.to);
              return (
                <Link
                  key={item.to} to={item.to} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground border border-primary/30"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto">
            <div className="glass rounded-xl p-3 text-xs">
              <div className="truncate font-medium">{email}</div>
              <Button variant="ghost" size="sm" onClick={signOut} className="mt-2 w-full justify-start text-muted-foreground">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/50 bg-background/50 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="font-semibold">StudyPilot <span className="text-gradient">AI</span></div>
          <div className="w-9" />
        </header>
        <main className="p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
