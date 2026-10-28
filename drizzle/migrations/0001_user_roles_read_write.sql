CREATE TYPE public.app_role AS ENUM ('admin', 'editor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.can_edit(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','editor'))
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Liste des comptes pour le super utilisateur
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(user_id uuid, email text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text,
    CASE WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin') THEN 'admin'
         WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'editor') THEN 'editor'
         ELSE 'viewer' END
  FROM auth.users u ORDER BY u.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_editor(_target uuid, _can_edit boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _can_edit THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_target, 'editor') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target AND role = 'editor';
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_editor(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_editor(uuid, boolean) TO authenticated;

DROP POLICY IF EXISTS "Team can create planning" ON public.planning_state;
DROP POLICY IF EXISTS "Team can update planning" ON public.planning_state;
CREATE POLICY "Editors can create planning" ON public.planning_state FOR INSERT TO authenticated
  WITH CHECK (id = 'main' AND public.can_edit(auth.uid()));
CREATE POLICY "Editors can update planning" ON public.planning_state FOR UPDATE TO authenticated
  USING (id = 'main' AND public.can_edit(auth.uid())) WITH CHECK (id = 'main' AND public.can_edit(auth.uid()));

INSERT INTO public.user_roles(user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'tboileau@cinemeccanica.fr'
ON CONFLICT DO NOTHING;