CREATE OR REPLACE FUNCTION public.planning_changed_missions(_old jsonb, _new jsonb)
RETURNS TABLE(before_mission jsonb, after_mission jsonb)
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=public,pg_catalog AS $$
DECLARE old_items jsonb:=coalesce(_old->'assignments','[]'); new_items jsonb:=coalesce(_new->'assignments','[]'); positions jsonb:='{}'; seen jsonb:='{}'; i integer; j integer; mission_id text; old_item jsonb; new_item jsonb;
BEGIN
 FOR i IN 0..jsonb_array_length(new_items)-1 LOOP
  mission_id:=new_items->i->>'id';
  IF mission_id IS NOT NULL THEN positions:=positions || jsonb_build_object(mission_id,i); END IF;
 END LOOP;
 FOR i IN 0..jsonb_array_length(old_items)-1 LOOP
  old_item:=old_items->i; mission_id:=old_item->>'id'; j:=(positions->>mission_id)::integer;
  new_item:=CASE WHEN j IS NULL THEN NULL ELSE new_items->j END;
  IF mission_id IS NOT NULL THEN seen:=seen || jsonb_build_object(mission_id,true); END IF;
  IF old_item IS DISTINCT FROM new_item THEN before_mission:=old_item; after_mission:=new_item; RETURN NEXT; END IF;
 END LOOP;
 FOR i IN 0..jsonb_array_length(new_items)-1 LOOP
  new_item:=new_items->i;
  IF NOT seen ? (new_item->>'id') THEN before_mission:=NULL; after_mission:=new_item; RETURN NEXT; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.planning_changed_missions(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.planning_changed_missions(jsonb,jsonb) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.enforce_support_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE sup jsonb; changed record; mission jsonb;
BEGIN
 IF auth.uid() IS NULL OR public.can_edit(auth.uid()) THEN RETURN NEW; END IF;
 IF NOT public.is_support_editor(auth.uid()) THEN RAISE EXCEPTION 'Lecture seule'; END IF;
 IF NEW.broadcast_list IS DISTINCT FROM OLD.broadcast_list OR NEW.data->'technicians' IS DISTINCT FROM OLD.data->'technicians' OR NEW.data->'categories' IS DISTINCT FROM OLD.data->'categories' THEN RAISE EXCEPTION 'Droits limités aux missions du support'; END IF;
 sup:=public.support_technician_ids(OLD.data);
 FOR changed IN SELECT * FROM public.planning_changed_missions(OLD.data,NEW.data) LOOP
  FOR mission IN SELECT changed.before_mission UNION ALL SELECT changed.after_mission LOOP
   IF mission IS NOT NULL AND (jsonb_array_length(coalesce(mission->'technicianIds','[]'))=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(mission->'technicianIds') tid WHERE NOT sup ? tid)) THEN RAISE EXCEPTION 'Droits limités aux missions du support'; END IF;
  END LOOP;
 END LOOP;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.log_support_missions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE sup jsonb; em text; changed record; mission jsonb;
BEGIN
 sup:=public.support_technician_ids(OLD.data)||public.support_technician_ids(NEW.data);
 SELECT email INTO em FROM auth.users WHERE id=auth.uid();
 FOR changed IN SELECT * FROM public.planning_changed_missions(OLD.data,NEW.data) LOOP
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(changed.before_mission->'technicianIds','[]')||coalesce(changed.after_mission->'technicianIds','[]')) tid WHERE sup ? tid) THEN
   mission:=coalesce(changed.after_mission,changed.before_mission);
   INSERT INTO public.mission_history(user_id,user_email,action,mission_id,title,technicians,date_iso,before,after)
   SELECT auth.uid(),em,CASE WHEN changed.before_mission IS NULL THEN 'création' WHEN changed.after_mission IS NULL THEN 'suppression' ELSE 'modification' END,
   mission->>'id',mission->>'title',
   (SELECT string_agg(t->>'name',', ') FROM jsonb_array_elements(coalesce(NEW.data->'technicians','[]')) t WHERE mission->'technicianIds' ? (t->>'id')),mission->>'dateISO',changed.before_mission,changed.after_mission;
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.capture_planning_usage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.planning_usage_daily WHERE day=(now() AT TIME ZONE 'Europe/Paris')::date) THEN PERFORM public.capture_planning_usage(); END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.write_planning_delta(_patch jsonb,_previous_version timestamptz,_next_version timestamptz) RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog SET work_mem='8MB' AS $$
DECLARE d jsonb; v timestamptz; section text; changes jsonb; item_id text; change jsonb; item jsonb; idx integer; key text; items jsonb; saved timestamptz;
BEGIN
 IF _next_version<=_previous_version OR jsonb_typeof(_patch)<>'object' THEN RAISE EXCEPTION 'Modification invalide'; END IF;
 SELECT data,updated_at INTO d,v FROM public.planning_state WHERE id='main' FOR UPDATE;
 IF v IS DISTINCT FROM _previous_version THEN RETURN NULL; END IF;
 FOR section,changes IN SELECT * FROM jsonb_each(_patch) LOOP
  IF section NOT IN ('assignments','technicians','categories') THEN RAISE EXCEPTION 'Rubrique invalide'; END IF;
  FOR item_id,change IN SELECT * FROM jsonb_each(coalesce(changes->'update','{}')) LOOP
   SELECT i INTO idx FROM generate_series(0,jsonb_array_length(d->section)-1) i WHERE d->section->i->>'id'=item_id;
   IF idx IS NULL THEN RAISE EXCEPTION 'Élément introuvable'; END IF;
   item:=d->section->idx;
   FOR key IN SELECT jsonb_array_elements_text(coalesce(change->'unset','[]')) LOOP
    IF key='id' THEN RAISE EXCEPTION 'Identifiant immuable'; END IF;
    item:=item-key;
   END LOOP;
   IF coalesce(change->'set','{}') ? 'id' THEN RAISE EXCEPTION 'Identifiant immuable'; END IF;
   d:=jsonb_set(d,ARRAY[section,idx::text],item || coalesce(change->'set','{}'));
  END LOOP;
  FOR item_id IN SELECT jsonb_array_elements_text(coalesce(changes->'remove','[]')) LOOP
   SELECT i INTO idx FROM generate_series(0,jsonb_array_length(d->section)-1) i WHERE d->section->i->>'id'=item_id;
   IF idx IS NOT NULL THEN d:=d #- ARRAY[section,idx::text]; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(changes->'add','[]')) LOOP
   IF item->>'id' IS NULL OR EXISTS (SELECT 1 FROM generate_series(0,jsonb_array_length(d->section)-1) i WHERE d->section->i->>'id'=item->>'id') THEN RAISE EXCEPTION 'Identifiant invalide'; END IF;
  END LOOP;
  IF jsonb_array_length(coalesce(changes->'add','[]'))>0 THEN d:=jsonb_set(d,ARRAY[section],(d->section) || (changes->'add')); END IF;
  IF changes ? 'order' THEN
   SELECT jsonb_agg(x.a ORDER BY o.ord) INTO items FROM jsonb_array_elements_text(changes->'order') WITH ORDINALITY o(id,ord) JOIN LATERAL (SELECT d->section->i a FROM generate_series(0,jsonb_array_length(d->section)-1) i WHERE d->section->i->>'id'=o.id) x ON true;
   IF jsonb_array_length(coalesce(items,'[]'))<>jsonb_array_length(d->section) THEN RAISE EXCEPTION 'Ordre invalide'; END IF;
   d:=jsonb_set(d,ARRAY[section],coalesce(items,'[]'));
  END IF;
 END LOOP;
 UPDATE public.planning_state SET data=d,updated_at=_next_version WHERE id='main' AND updated_at=_previous_version RETURNING updated_at INTO saved;
 RETURN saved;
END $$;