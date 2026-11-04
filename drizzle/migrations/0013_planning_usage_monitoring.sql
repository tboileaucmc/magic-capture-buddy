CREATE TABLE public.planning_usage_daily (
 day date PRIMARY KEY,
 measured_at timestamptz NOT NULL DEFAULT now(),
 mission_count bigint NOT NULL,
 recurring_count bigint NOT NULL,
 exception_count bigint NOT NULL,
 planning_json_bytes bigint NOT NULL,
 planning_table_bytes bigint NOT NULL,
 history_table_bytes bigint NOT NULL,
 database_bytes bigint NOT NULL
);
GRANT SELECT ON public.planning_usage_daily TO authenticated;
GRANT ALL ON public.planning_usage_daily TO service_role;
ALTER TABLE public.planning_usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read usage history" ON public.planning_usage_daily FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.capture_planning_usage() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE p jsonb; a jsonb; d date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
 SELECT data INTO p FROM public.planning_state WHERE id = 'main';
 a := CASE WHEN jsonb_typeof(p->'assignments') = 'array' THEN p->'assignments' ELSE '[]'::jsonb END;
 INSERT INTO public.planning_usage_daily(day, measured_at, mission_count, recurring_count, exception_count, planning_json_bytes, planning_table_bytes, history_table_bytes, database_bytes)
 SELECT d, now(), jsonb_array_length(a),
 (SELECT count(*) FROM jsonb_array_elements(a) x WHERE x->>'recurrence' = 'weekly'),
 (SELECT count(*) FROM jsonb_array_elements(a) x WHERE x->>'seriesId' IS NOT NULL),
 octet_length(coalesce(p, '{}'::jsonb)::text), pg_total_relation_size('public.planning_state'), pg_total_relation_size('public.mission_history'), pg_database_size(current_database())
 ON CONFLICT (day) DO UPDATE SET measured_at = excluded.measured_at, mission_count = excluded.mission_count, recurring_count = excluded.recurring_count, exception_count = excluded.exception_count, planning_json_bytes = excluded.planning_json_bytes, planning_table_bytes = excluded.planning_table_bytes, history_table_bytes = excluded.history_table_bytes, database_bytes = excluded.database_bytes;
END; $$;
REVOKE ALL ON FUNCTION public.capture_planning_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_planning_usage() TO service_role;
CREATE OR REPLACE FUNCTION public.capture_planning_usage_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$ BEGIN PERFORM public.capture_planning_usage(); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.capture_planning_usage_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER planning_usage_change AFTER INSERT OR UPDATE ON public.planning_state FOR EACH STATEMENT EXECUTE FUNCTION public.capture_planning_usage_change();
CREATE OR REPLACE FUNCTION public.admin_planning_usage() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Réservé aux super utilisateurs' USING ERRCODE = '42501'; END IF;
 PERFORM public.capture_planning_usage();
 SELECT jsonb_build_object('current', (SELECT to_jsonb(u) FROM public.planning_usage_daily u ORDER BY day DESC LIMIT 1), 'history', coalesce((SELECT jsonb_agg(to_jsonb(u) ORDER BY day) FROM (SELECT * FROM public.planning_usage_daily ORDER BY day DESC LIMIT 90) u), '[]'::jsonb)) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.admin_planning_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_planning_usage() TO authenticated, service_role;