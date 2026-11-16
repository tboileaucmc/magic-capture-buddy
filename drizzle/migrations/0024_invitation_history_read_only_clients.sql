REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.invitation_sends FROM authenticated, anon;
REVOKE SELECT ON public.invitation_sends FROM anon;
GRANT SELECT ON public.invitation_sends TO authenticated;
GRANT ALL ON public.invitation_sends TO service_role;