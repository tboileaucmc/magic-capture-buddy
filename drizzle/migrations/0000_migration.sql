CREATE TABLE public.planning_state (
  id text PRIMARY KEY DEFAULT 'main',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  broadcast_list text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.planning_state TO authenticated;
GRANT ALL ON public.planning_state TO service_role;
ALTER TABLE public.planning_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can read planning" ON public.planning_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can create planning" ON public.planning_state FOR INSERT TO authenticated WITH CHECK (id = 'main');
CREATE POLICY "Team can update planning" ON public.planning_state FOR UPDATE TO authenticated USING (id = 'main') WITH CHECK (id = 'main');