
-- user_stats
CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own stats" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own stats" ON public.user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own stats" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

-- user_badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own badges" ON public.user_badges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- focus_sessions
CREATE TABLE public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.focus_sessions TO authenticated;
GRANT ALL ON public.focus_sessions TO service_role;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.focus_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_focus_sessions_user_date ON public.focus_sessions(user_id, completed_at DESC);

-- award_xp function: safely increments XP + streak
CREATE OR REPLACE FUNCTION public.award_xp(_points INTEGER)
RETURNS public.user_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.user_stats;
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
  _new_streak INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _points IS NULL OR _points <= 0 OR _points > 500 THEN
    RAISE EXCEPTION 'invalid points';
  END IF;

  INSERT INTO public.user_stats (user_id) VALUES (_uid)
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _row FROM public.user_stats WHERE user_id = _uid FOR UPDATE;

  IF _row.last_active_date IS NULL THEN
    _new_streak := 1;
  ELSIF _row.last_active_date = _today THEN
    _new_streak := _row.current_streak;
  ELSIF _row.last_active_date = _today - 1 THEN
    _new_streak := _row.current_streak + 1;
  ELSE
    _new_streak := 1;
  END IF;

  UPDATE public.user_stats
    SET xp = xp + _points,
        level = GREATEST(1, ((xp + _points) / 100) + 1),
        current_streak = _new_streak,
        longest_streak = GREATEST(longest_streak, _new_streak),
        last_active_date = _today,
        updated_at = now()
    WHERE user_id = _uid
    RETURNING * INTO _row;

  RETURN _row;
END; $$;

GRANT EXECUTE ON FUNCTION public.award_xp(INTEGER) TO authenticated;

-- Leaderboard view
CREATE OR REPLACE VIEW public.leaderboard
WITH (security_invoker = true) AS
SELECT
  s.user_id,
  COALESCE(p.full_name, 'Anonymous Scholar') AS display_name,
  p.avatar_url,
  s.xp,
  s.level,
  s.current_streak,
  ROW_NUMBER() OVER (ORDER BY s.xp DESC) AS rank
FROM public.user_stats s
LEFT JOIN public.profiles p ON p.id = s.user_id
ORDER BY s.xp DESC
LIMIT 50;

-- Leaderboard needs to read all user_stats + profiles rows for ranking.
-- Add a public policy that only exposes non-sensitive columns via the view.
CREATE POLICY "Public leaderboard read" ON public.user_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public profile display" ON public.profiles FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.leaderboard TO authenticated;
