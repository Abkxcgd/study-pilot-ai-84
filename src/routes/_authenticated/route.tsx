import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BookOpen,
  Calendar as CalendarIcon,
  ListChecks,
  Layers,
  BarChart3,
  Settings,
  GraduationCap,
  LogOut,
  Menu,
  X,
  FileSearch,
  CalendarClock,
  Timer,
  Mic,
  Trophy,
  Brain,
  Lightbulb,
  Briefcase,
  Sparkles,
  Map,
  FileUser,
  MessageSquareQuote,
  Network,
  Target,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AskAiFab } from "@/components/AskAiFab";
import { NotificationBell } from "@/components/NotificationBell";

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
  { to: "/tutor", label: "AI Tutor", icon: Lightbulb },
  { to: "/voice-tutor", label: "Voice Tutor", icon: Mic },
  { to: "/brain", label: "Second Brain", icon: Brain },
  { to: "/insights", label: "AI Insights", icon: Sparkles },
  { to: "/exam", label: "Exam Mode", icon: GraduationCap },
  { to: "/predictor", label: "Exam Predictor", icon: Target },
  { to: "/mindmap", label: "Mind Maps", icon: Network },
  { to: "/revision", label: "Revision Planner", icon: RefreshCw },
  { to: "/doubt-solver", label: "Doubt Solver", icon: HelpCircle },
  { to: "/career", label: "Career Assistant", icon: Briefcase },
  { to: "/resume-builder", label: "Resume Builder", icon: FileUser },
  { to: "/mock-interview", label: "Mock Interview", icon: MessageSquareQuote },
  { to: "/roadmap", label: "Career Roadmap", icon: Map },
  { to: "/notes", label: "Notes Summarizer", icon: FileText },
  { to: "/handwriting", label: "Handwriting OCR", icon: PenLine },
  { to: "/voice-notes", label: "Voice Notes", icon: Mic },
  { to: "/assignments", label: "Assignments", icon: BookOpen },
  { to: "/planner", label: "Study Planner", icon: CalendarClock },
  { to: "/tasks", label: "To-Do Board", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarIcon },
  { to: "/focus", label: "Focus Timer", icon: Timer },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/pdf-chat", label: "PDF Chat", icon: FileSearch },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
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
      {/* Mobile backdrop */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl transition-transform duration-300 ease-out`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="group flex items-center gap-2 px-2 py-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent transition-transform group-hover:scale-105">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-semibold">
                StudyPilot <span className="text-gradient">AI</span>
              </span>
            </Link>
            <NotificationBell />
          </div>
          <nav className="mt-6 flex flex-col gap-1 overflow-y-auto pr-1 -mr-1">
            {nav.map((item) => {
              const active = location.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 border border-transparent ${
                    active
                      ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground border-primary/30"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0.5"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 transition-transform ${active ? "text-primary-glow" : "group-hover:scale-110"}`}
                  />{" "}
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-3">
            <div className="glass rounded-xl p-3 text-xs">
              <div className="truncate font-medium">{email}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="mt-2 w-full justify-start text-muted-foreground"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/50 bg-background/60 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="font-semibold">
            StudyPilot <span className="text-gradient">AI</span>
          </div>
          <NotificationBell />
        </header>
        <main key={location} className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <AskAiFab />
    </div>
  );
}
