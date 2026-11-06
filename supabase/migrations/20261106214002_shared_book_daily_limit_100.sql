-- Keep per-account locking, deduplication, and existing function permissions.
DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.create_shared_book(uuid,text,text,bigint,text)'::regprocedure) INTO definition;
 IF position('>=10 then raise exception ''UPLOAD_LIMIT'''  in definition) = 0 THEN
  RAISE EXCEPTION 'Unexpected shared book upload guard; inspect before changing';
 END IF;
 definition := replace(definition, '>=10 then raise exception ''UPLOAD_LIMIT''' , '>=100 then raise exception ''UPLOAD_LIMIT''' );
 EXECUTE definition;
END
$migration$;
