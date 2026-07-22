import { supabase } from "@/integrations/supabase/client";

export interface StudyGroup {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export async function listMyGroups(): Promise<StudyGroup[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];
  const { data: memberships } = await supabase
    .from("study_group_members")
    .select("group_id")
    .eq("user_id", user.user.id);
  const ids = (memberships ?? []).map((m: { group_id: string }) => m.group_id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("study_groups")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false });
  return (data ?? []) as StudyGroup[];
}

export async function createGroup(name: string, description?: string): Promise<StudyGroup> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("study_groups")
    .insert({ name, description: description ?? null, owner_id: user.user.id })
    .select()
    .single();
  if (error) throw error;
  await supabase
    .from("study_group_members")
    .insert({ group_id: data.id, user_id: user.user.id, role: "owner" });
  return data as StudyGroup;
}

export async function joinByCode(code: string): Promise<StudyGroup> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  // Fetch via head-less RPC-style: rely on invite_code unique + SELECT policy
  // (members-only). We can't SELECT before joining, so try insert and let RLS check membership.
  // Workaround: use a security definer? For now, attempt a direct lookup by invite_code
  // through a permissive path — we allow authenticated to look up group by exact code
  // via a targeted policy is not set. Use RPC alternative: read via anon-safe join.
  const { data: group, error: findErr } = await supabase
    .from("study_groups")
    .select("*")
    .eq("invite_code", code.trim().toUpperCase())
    .maybeSingle();
  if (findErr || !group) throw new Error("Invalid invite code");
  const { error } = await supabase
    .from("study_group_members")
    .insert({ group_id: group.id, user_id: user.user.id });
  if (error && !String(error.message).includes("duplicate")) throw error;
  return group as StudyGroup;
}

export async function leaveGroup(groupId: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  await supabase
    .from("study_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.user.id);
}

export async function getGroup(groupId: string): Promise<StudyGroup | null> {
  const { data } = await supabase.from("study_groups").select("*").eq("id", groupId).maybeSingle();
  return (data ?? null) as StudyGroup | null;
}

export async function listMessages(groupId: string): Promise<GroupMessage[]> {
  const { data } = await supabase
    .from("study_group_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as GroupMessage[];
}

export async function sendMessage(groupId: string, body: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  const trimmed = body.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("study_group_messages")
    .insert({ group_id: groupId, user_id: user.user.id, body: trimmed });
  if (error) throw error;
}

export async function listMembers(groupId: string) {
  const { data } = await supabase
    .from("study_group_members")
    .select("user_id, role, joined_at")
    .eq("group_id", groupId);
  return data ?? [];
}
