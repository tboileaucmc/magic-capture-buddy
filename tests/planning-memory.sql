-- Run in a transaction and roll back; no production mission is modified.
DO $$
DECLARE old_data jsonb; new_data jsonb; result record; count_changes integer; payload text:=repeat('A',1000000);
BEGIN
 old_data:=jsonb_build_object('assignments',jsonb_build_array(
  jsonb_build_object('id','one','title','Avant','technicianIds',jsonb_build_array('support'),'attachments',jsonb_build_array(jsonb_build_object('dataUrl',payload))),
  jsonb_build_object('id','two','title','Inchangée','technicianIds',jsonb_build_array('field'),'attachments',jsonb_build_array(jsonb_build_object('dataUrl',payload)))));
 new_data:=jsonb_set(old_data,'{assignments,0,title}','"Après"');
 SELECT count(*) INTO count_changes FROM public.planning_changed_missions(old_data,new_data);
 IF count_changes<>1 THEN RAISE EXCEPTION 'Expected exactly one changed mission'; END IF;
 SELECT * INTO result FROM public.planning_changed_missions(old_data,new_data);
 IF result.before_mission->>'title'<>'Avant' OR result.after_mission->>'title'<>'Après' THEN RAISE EXCEPTION 'History lost before/after'; END IF;
 IF result.after_mission->'attachments'->0->>'dataUrl'<>payload THEN RAISE EXCEPTION 'Attachment lost'; END IF;
 new_data:=jsonb_set(old_data,'{assignments,0,technicianIds}','["field"]');
 SELECT * INTO result FROM public.planning_changed_missions(old_data,new_data);
 IF result.before_mission->'technicianIds'<>'["support"]'::jsonb OR result.after_mission->'technicianIds'<>'["field"]'::jsonb THEN RAISE EXCEPTION 'Team transfer lost one side'; END IF;
 IF (SELECT count(*) FROM public.planning_changed_missions(old_data,old_data))<>0 THEN RAISE EXCEPTION 'Unchanged mission reported'; END IF;
 IF (SELECT count(*) FROM public.planning_changed_missions(old_data,'{"assignments":[]}'))<>2 THEN RAISE EXCEPTION 'Deleted missions missing'; END IF;
 IF (SELECT count(*) FROM public.planning_changed_missions('{"assignments":[]}',old_data))<>2 THEN RAISE EXCEPTION 'Created missions missing'; END IF;
END $$;