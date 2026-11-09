-- Run in a transaction: tests the production trigger on a temporary table,
-- never creates real accounts or sends confirmation emails.
BEGIN;
CREATE TEMP TABLE planning_signup_probe (email text);
CREATE TRIGGER planning_signup_probe_domain
BEFORE INSERT ON planning_signup_probe
FOR EACH ROW EXECUTE FUNCTION public.enforce_planning_signup_domain();
DO $$
DECLARE candidate text;
BEGIN
  INSERT INTO planning_signup_probe VALUES ('thomas@cinemeccanica.fr'), ('Thomas@CINEMECCANICA.FR');
  IF (SELECT count(*) FROM planning_signup_probe) <> 2 THEN
    RAISE EXCEPTION 'Exact company domain must be accepted';
  END IF;
  FOREACH candidate IN ARRAY ARRAY['thomas@gmail.com', 'thomas@cinemeccanica-france.fr', 'thomas@support.cinemeccanica.fr', 'thomas@cinemeccanica.fr.example.com', 'thomas@@cinemeccanica.fr', '', NULL] LOOP
    BEGIN
      INSERT INTO planning_signup_probe VALUES (candidate);
      RAISE EXCEPTION 'Forbidden signup accepted';
    EXCEPTION WHEN check_violation THEN
      NULL;
    END;
  END LOOP;
  -- Existing accounts are deliberately unaffected by UPDATE.
  UPDATE planning_signup_probe SET email = 'existing@gmail.com';
  IF (SELECT count(*) FROM planning_signup_probe WHERE email = 'existing@gmail.com') <> 2 THEN
    RAISE EXCEPTION 'Existing accounts must remain unaffected';
  END IF;
END;
$$;
ROLLBACK;