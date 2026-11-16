CREATE OR REPLACE FUNCTION public.read_planning_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_catalog
SET statement_timeout = '30s'
SET work_mem = '64MB'
AS $$ SELECT jsonb_build_object('data', data, 'updatedAt', updated_at) FROM public.planning_state WHERE id = 'main' $$;
REVOKE ALL ON FUNCTION public.read_planning_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_planning_snapshot() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.write_planning_snapshot(_data jsonb, _previous_version timestamptz, _next_version timestamptz)
RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_catalog
SET statement_timeout = '30s'
SET work_mem = '64MB'
AS $$ DECLARE saved timestamptz; BEGIN
 IF _next_version <= _previous_version THEN RAISE EXCEPTION 'Version de planning invalide'; END IF;
 UPDATE public.planning_state SET data = _data, updated_at = _next_version
 WHERE id = 'main' AND updated_at = _previous_version RETURNING updated_at INTO saved;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.write_planning_snapshot(jsonb,timestamptz,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_planning_snapshot(jsonb,timestamptz,timestamptz) TO authenticated, service_role;