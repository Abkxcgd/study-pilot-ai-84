import { supabase } from "@/integrations/supabase/client";

export async function seedDemoData() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");

  const now = new Date();
  const addDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

  // Tasks
  const tasks = [
    { title: "Finish Linear Algebra assignment", priority: "high", status: "in_progress", due_date: addDays(2) },
    { title: "Read Chapter 5 — Databases", priority: "medium", status: "todo", due_date: addDays(1) },
    { title: "Review Machine Learning lecture", priority: "medium", status: "todo", due_date: addDays(3) },
    { title: "Solve 5 DSA problems", priority: "high", status: "todo", due_date: addDays(1) },
    { title: "Submit physics lab report", priority: "high", status: "done", due_date: addDays(-1) },
    { title: "Prepare notes for presentation", priority: "low", status: "todo", due_date: addDays(5) },
  ].map((t) => ({ ...t, user_id: user.id }));

  // Events (upcoming)
  const events = [
    { title: "Midterm — Machine Learning", event_type: "exam", event_date: addDays(7) },
    { title: "DBMS Assignment Deadline", event_type: "deadline", event_date: addDays(2) },
    { title: "Study group — Algorithms", event_type: "study", event_date: addDays(1) },
    { title: "Final Exam — Calculus", event_type: "exam", event_date: addDays(14) },
  ].map((e) => ({ ...e, user_id: user.id }));

  // Notes
  const notes = [
    {
      title: "Machine Learning — Bias vs Variance",
      source_text: "High bias means the model is too simple; high variance means it overfits. Regularization (L1, L2) reduces variance. Cross-validation helps estimate generalization error.",
      summary: "Bias/variance tradeoff explains under- vs overfitting. Use regularization and cross-validation.",
      key_points: ["Bias = underfitting", "Variance = overfitting", "L1/L2 regularization", "K-fold cross-validation"],
    },
    {
      title: "Data Structures — Big-O Cheatsheet",
      source_text: "Arrays: O(1) access, O(n) search. HashMap: O(1) avg lookup. BST: O(log n) balanced. Sorting: mergesort O(n log n).",
      summary: "Time complexity reference for core data structures and sorting algorithms.",
      key_points: ["Array O(1) access", "HashMap O(1) avg", "BST O(log n)", "Mergesort O(n log n)"],
    },
    {
      title: "Databases — Normalization",
      source_text: "1NF: atomic values. 2NF: no partial dependency. 3NF: no transitive dependency. BCNF: stricter 3NF.",
      summary: "Normal forms reduce redundancy in relational schemas.",
      key_points: ["1NF atomic", "2NF no partial dep", "3NF no transitive dep", "BCNF"],
    },
  ].map((n) => ({ ...n, user_id: user.id }));

  await Promise.all([
    supabase.from("tasks").insert(tasks),
    supabase.from("events").insert(events),
    supabase.from("notes").insert(notes),
  ]);

  // XP boost via RPC (also sets streak)
  await supabase.rpc("award_xp", { _points: 250 });
}
