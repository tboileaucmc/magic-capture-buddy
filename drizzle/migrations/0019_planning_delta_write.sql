CREATE OR REPLACE FUNCTION public.read_planning_version() RETURNS timestamptz LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_catalog AS $$ SELECT updated_at FROM public.planning_state WHERE id='main' $$;
REVOKE ALL ON FUNCTION public.read_planning_version() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_planning_version() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.write_planning_delta(_patch jsonb,_previous_version timestamptz,_next_version timestamptz) RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog SET work_mem='8MB' AS $$
DECLARE current_data jsonb; current_version timestamptz; section text; changes jsonb; items jsonb; result jsonb; item jsonb; change jsonb; key text; item_id text; saved timestamptz;
BEGIN
 IF _next_version <= _previous_version THEN RAISE EXCEPTION 'Version de planning invalide'; END IF;
 IF jsonb_typeof(_patch) <> 'object' THEN RAISE EXCEPTION 'Modification invalide'; END IF;
 SELECT data,updated_at INTO current_data,current_version FROM public.planning_state WHERE id='main' FOR UPDATE;
 IF current_version IS DISTINCT FROM _previous_version THEN RETURN NULL; END IF;
 FOR section,changes IN SELECT * FROM jsonb_each(_patch) LOOP
  IF section NOT IN ('assignments','technicians','categories') THEN RAISE EXCEPTION 'Rubrique invalide'; END IF;
  items:=coalesce(current_data->section,'[]'::jsonb); result:='[]'::jsonb;
  FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
   item_id:=item->>'id';
   IF coalesce(changes->'remove','[]'::jsonb) ? item_id THEN CONTINUE; END IF;
   change:=changes->'update'->item_id;
   IF change IS NOT NULL THEN
    FOR key IN SELECT jsonb_array_elements_text(coalesce(change->'unset','[]'::jsonb)) LOOP
     IF key='id' THEN RAISE EXCEPTION 'Identifiant immuable'; END IF;
     item:=item-key;
    END LOOP;
    IF coalesce(change->'set','{}'::jsonb) ? 'id' THEN RAISE EXCEPTION 'Identifiant immuable'; END IF;
    item:=item || coalesce(change->'set','{}'::jsonb);
   END IF;
   result:=result || jsonb_build_array(item);
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(changes->'add','[]'::jsonb)) LOOP
   IF item->>'id' IS NULL OR EXISTS (SELECT 1 FROM jsonb_array_elements(result) x WHERE x->>'id'=item->>'id') THEN RAISE EXCEPTION 'Identifiant invalide'; END IF;
   result:=result || jsonb_build_array(item);
  END LOOP;
  IF changes ? 'order' THEN
   IF jsonb_array_length(changes->'order') <> jsonb_array_length(result) THEN RAISE EXCEPTION 'Ordre invalide'; END IF;
   SELECT jsonb_agg(x.item ORDER BY o.ord) INTO items FROM jsonb_array_elements_text(changes->'order') WITH ORDINALITY o(id,ord) JOIN LATERAL (SELECT value item FROM jsonb_array_elements(result) WHERE value->>'id'=o.id) x ON true;
   IF jsonb_array_length(coalesce(items,'[]'::jsonb)) <> jsonb_array_length(result) THEN RAISE EXCEPTION 'Ordre invalide'; END IF;
   result:=coalesce(items,'[]'::jsonb);
  END IF;
  current_data:=jsonb_set(current_data,ARRAY[section],result);
 END LOOP;
 UPDATE public.planning_state SET data=current_data,updated_at=_next_version WHERE id='main' AND updated_at=_previous_version RETURNING updated_at INTO saved;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.write_planning_delta(jsonb,timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.write_planning_delta(jsonb,timestamptz,timestamptz) TO authenticated,service_role;