-- Preserve old clients while protecting the separate account-email field.
create or replace function public.redact_public_map_author_email()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.visibility = 'public' then
    new.author_email := null;
  end if;
  return new;
end;
$$;
revoke all on function public.redact_public_map_author_email() from public, anon, authenticated;
drop trigger if exists redact_public_map_author_email on public.content_maps;
create trigger redact_public_map_author_email
before insert or update on public.content_maps
for each row execute function public.redact_public_map_author_email();
update public.content_maps set author_email = null
where visibility = 'public' and author_email is not null;
alter table public.content_maps add constraint public_map_author_email_redacted
check (visibility <> 'public' or author_email is null);
