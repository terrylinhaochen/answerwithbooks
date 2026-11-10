create or replace function public.try_jsonb(p_text text) returns jsonb
language plpgsql immutable as $$ begin return p_text::jsonb; exception when others then return null; end $$;
revoke all on function public.try_jsonb(text) from public, anon, authenticated;

-- Compact public catalog: the card fields only, without the multi-megabyte artifacts column.
create or replace function public.public_catalog_compact(p_offset integer, p_limit integer)
returns table(id uuid,title text,author text,status text,run_state text,cover_status text,cover_path text,source_import jsonb,cursor integer,total_sections integer,duplicate_of uuid,orientation text,questions jsonb)
language sql stable set search_path = public as $$
  select j.id,j.title,j.author,j.status,j.run_state,j.cover_status,j.cover_path,
         jsonb_build_object('state',j.source_import->>'state'),j.cursor,j.total_sections,j.duplicate_of,
         coalesce(m.map->>'orientation',''),coalesce(m.map->'questions','[]'::jsonb)
  from book_processing_jobs j
  cross join lateral (select public.try_jsonb(j.artifacts->>'reading/map.json') as map) m
  where j.visibility='public' and j.status='ready' and j.duplicate_of is null
  order by j.created_at desc
  offset greatest(p_offset,0) limit least(greatest(p_limit,1),50)
$$;
revoke all on function public.public_catalog_compact(integer,integer) from public, anon, authenticated;
grant execute on function public.public_catalog_compact(integer,integer) to service_role;
