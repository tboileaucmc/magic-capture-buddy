ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_editor';

CREATE OR REPLACE FUNCTION public.is_support_editor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'support_editor')
$$;
REVOKE EXECUTE ON FUNCTION public.is_support_editor(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_support_editor(uuid) TO authenticated;

-- Techniciens support : à partir du premier dont le nom contient BRABANT, dans l'ordre du planning.
CREATE OR REPLACE FUNCTION public.support_technician_ids(_data jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  WITH t AS (SELECT e, i FROM jsonb_array_elements(coalesce(_data->'technicians','[]'::jsonb)) WITH ORDINALITY x(e, i)),
  s AS (SELECT min(i) AS i0 FROM t WHERE upper(e->>'name') LIKE '%BRABANT%')
  SELECT coalesce(jsonb_agg(e->>'id'), '[]'::jsonb) FROM t, s WHERE s.i0 IS NOT NULL AND t.i >= s.i0
$$;

CREATE OR REPLACE FUNCTION public.enforce_support_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sup jsonb; bad boolean;
BEGIN
  IF auth.uid() IS NULL OR public.can_edit(auth.uid()) THEN RETURN NEW; END IF;
  IF NOT public.is_support_editor(auth.uid()) THEN RAISE EXCEPTION 'Lecture seule'; END IF;
  IF NEW.broadcast_list IS DISTINCT FROM OLD.broadcast_list
     OR NEW.data->'technicians' IS DISTINCT FROM OLD.data->'technicians'
     OR NEW.data->'categories' IS DISTINCT FROM OLD.data->'categories' THEN
    RAISE EXCEPTION 'Droits limités aux missions du support';
  END IF;
  sup := public.support_technician_ids(OLD.data);
  WITH o AS (SELECT a FROM jsonb_array_elements(coalesce(OLD.data->'assignments','[]'::jsonb)) a),
       n AS (SELECT a FROM jsonb_array_elements(coalesce(NEW.data->'assignments','[]'::jsonb)) a),
       ch AS ((SELECT a FROM o EXCEPT SELECT a FROM n) UNION (SELECT a FROM n EXCEPT SELECT a FROM o))
  SELECT EXISTS (
    SELECT 1 FROM ch WHERE jsonb_array_length(coalesce(a->'technicianIds','[]'::jsonb)) = 0
       OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(a->'technicianIds') tid WHERE NOT sup ? tid)
  ) INTO bad;
  IF bad THEN RAISE EXCEPTION 'Droits limités aux missions du support'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS planning_support_scope ON public.planning_state;
CREATE TRIGGER planning_support_scope BEFORE UPDATE ON public.planning_state
  FOR EACH ROW EXECUTE FUNCTION public.enforce_support_scope();

DROP POLICY IF EXISTS "Editors can update planning" ON public.planning_state;
CREATE POLICY "Editors can update planning" ON public.planning_state FOR UPDATE TO authenticated
  USING (id = 'main' AND (public.can_edit(auth.uid()) OR public.is_support_editor(auth.uid())))
  WITH CHECK (id = 'main' AND (public.can_edit(auth.uid()) OR public.is_support_editor(auth.uid())));

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(user_id uuid, email text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text,
    CASE WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text = 'admin') THEN 'admin'
         WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text = 'editor') THEN 'editor'
         WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text = 'support_editor') THEN 'support_editor'
         ELSE 'viewer' END
  FROM auth.users u ORDER BY u.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_role(_target uuid, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _role NOT IN ('viewer','editor','support_editor') THEN RAISE EXCEPTION 'Rôle invalide'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _target AND role::text IN ('editor','support_editor');
  IF _role <> 'viewer' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_target, _role::public.app_role) ON CONFLICT DO NOTHING;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, text) TO authenticated;