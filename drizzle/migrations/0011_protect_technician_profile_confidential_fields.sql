-- Raw profile rows are restricted to admins, including CSV/Data API exports.
DROP POLICY IF EXISTS "Signed-in users read technician profiles" ON public.technician_profiles;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_profiles TO authenticated;
GRANT ALL ON public.technician_profiles TO service_role;
REVOKE ALL ON public.technician_profiles FROM anon;
ALTER TABLE public.technician_profiles ENABLE ROW LEVEL SECURITY;

-- The caller cannot supply a role or another user's identity.
CREATE OR REPLACE FUNCTION public.get_technician_profile(_technician_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile public.technician_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO profile FROM public.technician_profiles WHERE technician_id = _technician_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN to_jsonb(profile);
  END IF;
  -- Explicit allowlist: future columns are confidential by default.
  RETURN jsonb_build_object(
    'technician_id', profile.technician_id,
    'phone', profile.phone,
    'extension_3cx', profile.extension_3cx,
    'vehicle', profile.vehicle,
    'plate', profile.plate,
    'last_ct', profile.last_ct,
    'equipment', profile.equipment,
    'updated_at', profile.updated_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_technician_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_technician_profile(text) TO authenticated, service_role;
COMMENT ON FUNCTION public.get_technician_profile(text) IS 'Authenticated profile read; only admins receive trainings, fuel_card and btp_card. Direct table reads are admin-only.';