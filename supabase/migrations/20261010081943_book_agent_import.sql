-- Only authenticated Edge code may import; caller identity never comes from the package.
create function public.import_agent_book(p_user uuid,p_sha text,p_job jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare result public.book_processing_jobs;
begin
 if p_sha !~ '^[a-f0-9]{64}$' or p_user is null then raise exception 'Invalid import identity';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into result from public.book_processing_jobs where user_id=p_user and source_import->>'agentPackageSha'=p_sha order by created_at limit 1;
 if found then return jsonb_build_object('id',result.id);end if;
 if (select count(*) from public.book_processing_jobs where user_id=p_user and created_at>now()-interval '1 day')>=10 then raise exception 'Daily limit reached';end if;
 insert into public.book_processing_jobs(id,user_id,source_name,source_sha,source_text,source_manifest,title,author,chunks,notes,artifacts,skill_summary,status,run_state,cursor,cover_status,billing_required,billing,source_import)
 values((p_job->>'id')::uuid,p_user,'agent-source.txt',p_job->>'source_sha',p_job->>'source_text',p_job->'source_manifest',p_job->>'title',p_job->>'author',p_job->'chunks',p_job->'notes',p_job->'artifacts',p_job->'skill_summary','ready','complete',jsonb_array_length(p_job->'chunks'),'none',true,'{"state":"imported","chargedCents":0}',jsonb_build_object('route','customer-agent','agentPackageSha',p_sha,'state','complete')) returning * into result;
 -- The existing ready-book trigger populates the same owner-scoped retrieval index.
 -- billing_required stays true so later paid operations cannot bypass spending approval.
 return jsonb_build_object('id',result.id);
end; $$;
revoke all on function public.import_agent_book(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.import_agent_book(uuid,text,jsonb) to service_role;
create index book_agent_import_hash on public.book_processing_jobs(user_id,(source_import->>'agentPackageSha')) where source_import->>'route'='customer-agent';
