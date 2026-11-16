CREATE OR REPLACE FUNCTION public.log_support_missions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE sup jsonb; em text; candidate_ids text[];
BEGIN
 sup := public.support_technician_ids(NEW.data) || public.support_technician_ids(OLD.data);
 SELECT array_agg(DISTINCT a->>'id') INTO candidate_ids
 FROM (
  SELECT a FROM jsonb_array_elements(coalesce(OLD.data->'assignments','[]')) a
  UNION ALL
  SELECT a FROM jsonb_array_elements(coalesce(NEW.data->'assignments','[]')) a
 ) assignments
 WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(coalesce(a->'technicianIds','[]')) tid WHERE sup ? tid);
 IF candidate_ids IS NULL THEN RETURN NEW; END IF;
 SELECT email INTO em FROM auth.users WHERE id = auth.uid();
 INSERT INTO public.mission_history(user_id,user_email,action,mission_id,title,technicians,date_iso,before,after)
 SELECT auth.uid(),em,
 CASE WHEN o.a IS NULL THEN 'création' WHEN n.a IS NULL THEN 'suppression' ELSE 'modification' END,
 coalesce(n.id,o.id),coalesce(n.a,o.a)->>'title',
 (SELECT string_agg(t->>'name', ', ') FROM jsonb_array_elements(coalesce(NEW.data->'technicians','[]')) t WHERE coalesce(n.a,o.a)->'technicianIds' ? (t->>'id')),
 coalesce(n.a,o.a)->>'dateISO',o.a,n.a
 FROM (SELECT a->>'id' id,a FROM jsonb_array_elements(coalesce(OLD.data->'assignments','[]')) a WHERE a->>'id'=ANY(candidate_ids)) o
 FULL JOIN (SELECT a->>'id' id,a FROM jsonb_array_elements(coalesce(NEW.data->'assignments','[]')) a WHERE a->>'id'=ANY(candidate_ids)) n ON o.id=n.id
 WHERE o.a IS DISTINCT FROM n.a;
 RETURN NEW;
END $$;