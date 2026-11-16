CREATE OR REPLACE FUNCTION public.write_planning_delta(_patch jsonb,_previous_version timestamptz,_next_version timestamptz) RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog SET work_mem='8MB' AS $$
DECLARE d jsonb; v timestamptz; section text; changes jsonb; item_id text; change jsonb; item jsonb; idx integer; key text; items jsonb; saved timestamptz;
BEGIN
 IF _next_version<=_previous_version OR jsonb_typeof(_patch)<>'object' THEN RAISE EXCEPTION 'Modification invalide'; END IF;
 SELECT data,updated_at INTO d,v FROM public.planning_state WHERE id='main' FOR UPDATE;
 IF v IS DISTINCT FROM _previous_version THEN RETURN NULL; END IF;
 FOR section,changes IN SELECT * FROM jsonb_each(_patch) LOOP
  IF section NOT IN ('assignments','technicians','categories') THEN RAISE EXCEPTION 'Rubrique invalide'; END IF;
  FOR item_id,change IN SELECT * FROM jsonb_each(coalesce(changes->'update','{}')) LOOP
   SELECT (ord-1)::integer INTO idx FROM jsonb_array_elements(d->section) WITH ORDINALITY x(a,ord) WHERE a->>'id'=item_id;
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
   SELECT (ord-1)::integer INTO idx FROM jsonb_array_elements(d->section) WITH ORDINALITY x(a,ord) WHERE a->>'id'=item_id;
   IF idx IS NOT NULL THEN d:=d #- ARRAY[section,idx::text]; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(changes->'add','[]')) LOOP
   IF item->>'id' IS NULL OR EXISTS (SELECT 1 FROM jsonb_array_elements(d->section) x WHERE x->>'id'=item->>'id') THEN RAISE EXCEPTION 'Identifiant invalide'; END IF;
  END LOOP;
  IF jsonb_array_length(coalesce(changes->'add','[]'))>0 THEN d:=jsonb_set(d,ARRAY[section],(d->section) || (changes->'add')); END IF;
  IF changes ? 'order' THEN
   SELECT jsonb_agg(x.a ORDER BY o.ord) INTO items FROM jsonb_array_elements_text(changes->'order') WITH ORDINALITY o(id,ord) JOIN LATERAL (SELECT value a FROM jsonb_array_elements(d->section) WHERE value->>'id'=o.id) x ON true;
   IF jsonb_array_length(coalesce(items,'[]'))<>jsonb_array_length(d->section) THEN RAISE EXCEPTION 'Ordre invalide'; END IF;
   d:=jsonb_set(d,ARRAY[section],coalesce(items,'[]'));
  END IF;
 END LOOP;
 UPDATE public.planning_state SET data=d,updated_at=_next_version WHERE id='main' AND updated_at=_previous_version RETURNING updated_at INTO saved;
 RETURN saved;
END $$;