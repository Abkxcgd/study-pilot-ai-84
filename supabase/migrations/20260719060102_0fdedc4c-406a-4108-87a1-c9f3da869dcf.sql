
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.embeddings TO authenticated;
GRANT ALL ON public.embeddings TO service_role;

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own embeddings" ON public.embeddings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX embeddings_user_source_idx ON public.embeddings (user_id, source_type);
CREATE INDEX embeddings_vec_idx ON public.embeddings USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector(1536),
  match_user uuid,
  match_count int DEFAULT 6
)
RETURNS TABLE (id uuid, source_type text, source_id uuid, content text, metadata jsonb, similarity float)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT e.id, e.source_type, e.source_id, e.content, e.metadata,
         1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.embeddings e
  WHERE e.user_id = match_user
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
