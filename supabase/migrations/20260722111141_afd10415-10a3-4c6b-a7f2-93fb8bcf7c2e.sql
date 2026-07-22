
-- Study groups
CREATE TABLE public.study_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.study_group_members (
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE public.study_group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sgm_group_created ON public.study_group_messages(group_id, created_at DESC);
CREATE INDEX idx_sgmembers_user ON public.study_group_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_messages TO authenticated;
GRANT ALL ON public.study_groups TO service_role;
GRANT ALL ON public.study_group_members TO service_role;
GRANT ALL ON public.study_group_messages TO service_role;

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid recursive RLS on members
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = _group_id AND user_id = _user_id)
$$;

-- Groups: members can view; anyone authenticated can create (they become owner + member)
CREATE POLICY "members view group" ON public.study_groups FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()));
CREATE POLICY "create group" ON public.study_groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner update group" ON public.study_groups FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY "owner delete group" ON public.study_groups FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Members: users see their own memberships and memberships of groups they belong to
CREATE POLICY "view own memberships" ON public.study_group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_group_member(group_id, auth.uid()));
CREATE POLICY "join group as self" ON public.study_group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "leave group" ON public.study_group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Messages
CREATE POLICY "members view messages" ON public.study_group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "members send messages" ON public.study_group_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "author delete message" ON public.study_group_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_members;
