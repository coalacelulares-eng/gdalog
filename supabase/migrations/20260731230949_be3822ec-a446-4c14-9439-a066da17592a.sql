CREATE TABLE public.app_state (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.app_state TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_state TO authenticated;
GRANT ALL ON public.app_state TO service_role;

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_state_read" ON public.app_state FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app_state_insert" ON public.app_state FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "app_state_update" ON public.app_state FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);