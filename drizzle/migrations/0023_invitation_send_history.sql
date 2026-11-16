CREATE TABLE public.invitation_sends (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 user_id uuid NOT NULL,
 mission_id text NOT NULL,
 mission_title text NOT NULL,
 mission_start text NOT NULL,
 mission_end text NOT NULL,
 recipients jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
 event_id text,
 error_message text
);
GRANT SELECT ON public.invitation_sends TO authenticated;
GRANT ALL ON public.invitation_sends TO service_role;
ALTER TABLE public.invitation_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super administrators read invitation sends" ON public.invitation_sends FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE INDEX invitation_sends_created_idx ON public.invitation_sends(created_at DESC);
COMMENT ON TABLE public.invitation_sends IS 'Provider acceptance history, not email delivery receipts. No attachment payloads or credentials.';