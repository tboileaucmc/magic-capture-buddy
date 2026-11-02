-- Repeatable regression assertions, run as a privileged migration session.
-- No fixtures are written and no profile values are logged.
DO $$
DECLARE
  admin_id uuid;
  reader_id uuid;
  profile_id text;
  result jsonb;
  visible_count bigint;
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  SELECT u.id INTO reader_id FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id) LIMIT 1;
  SELECT technician_id INTO profile_id FROM public.technician_profiles LIMIT 1;
  IF admin_id IS NULL OR reader_id IS NULL OR profile_id IS NULL THEN
    RAISE EXCEPTION 'Access tests require an admin, a read-only account and an existing profile';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', reader_id::text, true);
  SET LOCAL ROLE authenticated;
  SELECT public.get_technician_profile(profile_id) INTO result;
  IF result IS NULL OR NOT (result ? 'phone') THEN RAISE EXCEPTION 'Reader lost public profile access'; END IF;
  IF result ? 'trainings' THEN RAISE EXCEPTION 'Reader can access trainings'; END IF;
  IF result ? 'fuel_card' THEN RAISE EXCEPTION 'Reader can access GR card'; END IF;
  IF result ? 'btp_card' THEN RAISE EXCEPTION 'Reader can access BTP card'; END IF;
  SELECT count(*) INTO visible_count FROM public.technician_profiles;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'Reader can export raw profiles'; END IF;
  SET LOCAL ROLE NONE;
  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  SET LOCAL ROLE authenticated;
  SELECT public.get_technician_profile(profile_id) INTO result;
  IF NOT (result ? 'trainings') THEN RAISE EXCEPTION 'Admin lost trainings access'; END IF;
  IF NOT (result ? 'fuel_card') THEN RAISE EXCEPTION 'Admin lost GR access'; END IF;
  IF NOT (result ? 'btp_card') THEN RAISE EXCEPTION 'Admin lost BTP access'; END IF;
  SELECT count(*) INTO visible_count FROM public.technician_profiles;
  IF visible_count = 0 THEN RAISE EXCEPTION 'Admin lost raw profile access'; END IF;
  SET LOCAL ROLE NONE;
  IF has_function_privilege('anon', 'public.get_technician_profile(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous caller can execute profile read';
  END IF;
END;
$$;