ALTER FUNCTION public.read_planning_snapshot() SET work_mem = '8MB';
ALTER FUNCTION public.write_planning_snapshot(jsonb,timestamptz,timestamptz) SET work_mem = '8MB';