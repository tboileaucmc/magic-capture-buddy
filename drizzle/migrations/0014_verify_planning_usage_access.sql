DO $$
DECLARE admin_id uuid; reader_id uuid; target uuid; result jsonb; expected_count bigint;
BEGIN
 SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
 SELECT id INTO reader_id FROM auth.users WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.users.id) LIMIT 1;
 IF admin_id IS NULL OR reader_id IS NULL THEN RAISE EXCEPTION 'Existing admin and viewer required'; END IF;
 FOR target IN SELECT reader_id UNION SELECT user_id FROM public.user_roles WHERE role IN ('editor', 'support_editor') LOOP
   PERFORM set_config('request.jwt.claim.sub', target::text, true);
   SET LOCAL ROLE authenticated;
   BEGIN
     PERFORM public.admin_planning_usage();
     RAISE EXCEPTION 'Non-admin can read metrics';
   EXCEPTION WHEN insufficient_privilege THEN NULL;
   END;
   IF EXISTS (SELECT 1 FROM public.planning_usage_daily) THEN RAISE EXCEPTION 'Non-admin can read history'; END IF;
   IF has_function_privilege('authenticated', 'public.capture_planning_usage()', 'EXECUTE') THEN RAISE EXCEPTION 'User can bypass admin RPC'; END IF;
   SET LOCAL ROLE NONE;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
 SET LOCAL ROLE authenticated;
 result := public.admin_planning_usage();
 SELECT jsonb_array_length(data->'assignments') INTO expected_count FROM public.planning_state WHERE id = 'main';
 IF (result->'current'->>'mission_count')::bigint <> expected_count THEN RAISE EXCEPTION 'Mission count mismatch'; END IF;
 IF (result->'current'->>'planning_json_bytes')::bigint <> (SELECT octet_length(data::text) FROM public.planning_state WHERE id = 'main') THEN RAISE EXCEPTION 'Planning volume mismatch'; END IF;
 PERFORM public.admin_planning_usage();
 IF (SELECT count(*) FROM public.planning_usage_daily WHERE day = (now() AT TIME ZONE 'Europe/Paris')::date) <> 1 THEN RAISE EXCEPTION 'Duplicate daily samples'; END IF;
 SET LOCAL ROLE NONE;
 IF has_function_privilege('anon', 'public.admin_planning_usage()', 'EXECUTE') THEN RAISE EXCEPTION 'Anonymous RPC access'; END IF;
END $$;