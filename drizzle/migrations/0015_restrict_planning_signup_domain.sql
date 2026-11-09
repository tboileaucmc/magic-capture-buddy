CREATE OR REPLACE FUNCTION public.is_planning_signup_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(lower(btrim(_email)) ~ '^[^[:space:]@]+@cinemeccanica[.]fr$', false);
$$;
REVOKE ALL ON FUNCTION public.is_planning_signup_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_planning_signup_email(text) TO supabase_auth_admin, service_role;

CREATE OR REPLACE FUNCTION public.enforce_planning_signup_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_planning_signup_email(NEW.email) THEN
    RAISE EXCEPTION 'Les inscriptions sont réservées aux adresses @cinemeccanica.fr.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_planning_signup_domain() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_planning_signup_domain() TO supabase_auth_admin, service_role;

CREATE TRIGGER planning_signup_domain
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_planning_signup_domain();