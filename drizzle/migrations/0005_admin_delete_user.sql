CREATE OR REPLACE FUNCTION public.admin_delete_user(_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Réservé au super utilisateur'; END IF;
  IF _target = auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez pas supprimer votre propre compte'; END IF;
  IF public.has_role(_target, 'admin') THEN RAISE EXCEPTION 'Impossible de supprimer un super utilisateur'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _target;
  DELETE FROM auth.users WHERE id = _target;
END $$;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;