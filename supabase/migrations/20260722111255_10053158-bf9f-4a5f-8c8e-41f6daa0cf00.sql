
CREATE OR REPLACE FUNCTION public.join_group_by_code(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  gid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO gid FROM public.study_groups WHERE invite_code = upper(trim(_code));
  IF gid IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO public.study_group_members(group_id, user_id) VALUES (gid, auth.uid())
    ON CONFLICT DO NOTHING;
  RETURN gid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_group_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(TEXT) TO authenticated;
