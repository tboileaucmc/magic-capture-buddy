CREATE TABLE public.technician_profiles (
  technician_id text PRIMARY KEY,
  phone text,
  vehicle text,
  plate text,
  last_ct date,
  trainings jsonb NOT NULL DEFAULT '{}'::jsonb,
  equipment jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_profiles TO authenticated;
GRANT ALL ON public.technician_profiles TO service_role;
ALTER TABLE public.technician_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage technician profiles" ON public.technician_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));