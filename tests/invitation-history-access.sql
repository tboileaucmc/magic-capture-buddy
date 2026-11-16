-- Run in a transaction then roll back; no invitations are sent.
DO $$
DECLARE administrator uuid; account uuid;
BEGIN
 SELECT user_id INTO administrator FROM public.user_roles WHERE role='admin' LIMIT 1;
 IF administrator IS NULL THEN RAISE EXCEPTION 'Existing administrator required'; END IF;
 INSERT INTO public.invitation_sends(user_id,mission_id,mission_title,mission_start,mission_end,status)
 VALUES(administrator,'invitation-access-test','Contrôle accès temporaire','2026-12-07T13:00','2026-12-08T11:00','sent');
 FOR account IN SELECT id FROM auth.users WHERE id<>administrator AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.users.id AND role='admin') LOOP
  PERFORM set_config('request.jwt.claim.sub',account::text,true);
  SET LOCAL ROLE authenticated;
  IF EXISTS(SELECT 1 FROM public.invitation_sends WHERE mission_id='invitation-access-test') THEN RAISE EXCEPTION 'Non-administrator sees invitations'; END IF;
  IF has_table_privilege('authenticated','public.invitation_sends','INSERT') OR has_table_privilege('authenticated','public.invitation_sends','UPDATE') THEN RAISE EXCEPTION 'Browser can forge audit'; END IF;
  SET LOCAL ROLE NONE;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub',administrator::text,true);
 SET LOCAL ROLE authenticated;
 IF NOT EXISTS(SELECT 1 FROM public.invitation_sends WHERE mission_id='invitation-access-test') THEN RAISE EXCEPTION 'Administrator cannot read invitations'; END IF;
 SET LOCAL ROLE NONE;
END $$;