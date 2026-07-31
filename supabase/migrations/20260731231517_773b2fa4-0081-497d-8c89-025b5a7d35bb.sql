DROP POLICY IF EXISTS "app_state_read" ON public.app_state;
DROP POLICY IF EXISTS "app_state_insert" ON public.app_state;
DROP POLICY IF EXISTS "app_state_update" ON public.app_state;

REVOKE ALL ON public.app_state FROM anon;

CREATE POLICY "app_state_read" ON public.app_state
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "app_state_insert" ON public.app_state
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "app_state_update" ON public.app_state
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);