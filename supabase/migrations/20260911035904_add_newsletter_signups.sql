-- Private subscriber records; no browser access, including signed-in users.
create table public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email)) and length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  consent_version text not null check (consent_version = 'awb-newsletter-v1'),
  consent_at timestamptz not null default now(),
  source_path text not null check (length(source_path) <= 200),
  source_origin text not null check (length(source_origin) <= 200),
  status text not null default 'pending_delivery' check (status in ('pending_delivery','exported','unsubscribed')),
  email_verified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.newsletter_signups enable row level security;
revoke all on public.newsletter_signups from public, anon, authenticated;
grant select, insert, update, delete on public.newsletter_signups to service_role;

create table public.newsletter_signup_limits (
  rate_key text not null,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (rate_key,window_start)
);
create index newsletter_signup_limits_expiry on public.newsletter_signup_limits(window_start);
alter table public.newsletter_signup_limits enable row level security;
revoke all on public.newsletter_signup_limits from public, anon, authenticated;
grant select, insert, update, delete on public.newsletter_signup_limits to service_role;

create function public.record_newsletter_signup(p_email text,p_source_path text,p_source_origin text,p_rate_key text,p_consent_version text)
returns text language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  if p_rate_key is null or p_rate_key !~ '^[0-9a-f]{64}$' then raise exception 'Invalid rate key'; end if;
  delete from public.newsletter_signup_limits where window_start < now() - interval '1 day';
  insert into public.newsletter_signup_limits(rate_key,window_start,attempts)
    values(p_rate_key,date_trunc('hour',now()),1)
    on conflict(rate_key,window_start) do update set attempts = public.newsletter_signup_limits.attempts + 1
    returning attempts into n;
  if n > 10 then return 'rate_limited'; end if;
  insert into public.newsletter_signups(email,source_path,source_origin,consent_version)
    values(lower(btrim(p_email)),p_source_path,p_source_origin,p_consent_version)
    on conflict(email) do nothing;
  -- Do not resubscribe opted-out addresses or disclose existing membership.
  return 'accepted';
end;
$$;
revoke all on function public.record_newsletter_signup(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.record_newsletter_signup(text,text,text,text,text) to service_role;
