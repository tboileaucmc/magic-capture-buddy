CREATE TABLE public.mission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  mission_id text NOT NULL,
  title text,
  technicians text,
  date_iso text,
  before jsonb,
  after jsonb
);
GRANT SELECT ON public.mission_history TO authenticated;
GRANT ALL ON public.mission_history TO service_role;
ALTER TABLE public.mission_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read mission history" ON public.mission_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX mission_history_created_idx ON public.mission_history (created_at DESC);

CREATE OR REPLACE FUNCTION public.log_support_missions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sup jsonb; em text;
BEGIN
  sup := public.support_technician_ids(NEW.data) || public.support_technician_ids(OLD.data);
  SELECT email INTO em FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.mission_history(user_id, user_email, action, mission_id, title, technicians, date_iso, before, after)
  SELECT auth.uid(), em,
    CASE WHEN o.a IS NULL THEN 'création' WHEN n.a IS NULL THEN 'suppression' ELSE 'modification' END,
    coalesce(n.id, o.id),
    coalesce(n.a, o.a)->>'title',
    (SELECT string_agg(t->>'name', ', ') FROM jsonb_array_elements(coalesce(NEW.data->'technicians','[]')) t
       WHERE coalesce(n.a, o.a)->'technicianIds' ? (t->>'id')),
    coalesce(n.a, o.a)->>'dateISO',
    o.a, n.a
  FROM (SELECT a->>'id' id, a FROM jsonb_array_elements(coalesce(OLD.data->'assignments','[]')) a) o
  FULL JOIN (SELECT a->>'id' id, a FROM jsonb_array_elements(coalesce(NEW.data->'assignments','[]')) a) n ON o.id = n.id
  WHERE o.a IS DISTINCT FROM n.a
    AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(coalesce(coalesce(n.a, o.a)->'technicianIds','[]')
                 || coalesce(o.a->'technicianIds','[]')) tid WHERE sup ? tid);
  RETURN NEW;
END $$;

CREATE TRIGGER planning_log_support AFTER UPDATE ON public.planning_state
  FOR EACH ROW EXECUTE FUNCTION public.log_support_missions();