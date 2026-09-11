import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Disposable local cluster: no remote auth users or customer records are touched.
const bin = '/opt/homebrew/opt/postgresql@14/bin';
const temp = mkdtempSync(path.join(tmpdir(), 'awb-privacy-pg-'));
const data = path.join(temp, 'data');
const command = (name, args, input) => execFileSync(path.join(bin, name), args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
let started = false;
try {
  command('initdb', ['-D', data, '-A', 'trust', '--no-locale']);
  command('pg_ctl', ['-D', data, '-l', path.join(temp, 'postgres.log'), '-o', `-F -k ${temp} -p 55437 -c listen_addresses=''`, '-w', 'start']);
  started = true;
  const setup = `
create role anon; create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth to anon, authenticated;
insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
`;
  const fixture = readFileSync('supabase/migrations/20260707003000_create_content_maps.sql', 'utf8');
  const migration = readFileSync('supabase/migrations/20260911054611_protect_public_map_author_email.sql', 'utf8');
  const tests = `
grant select on public.content_maps to anon;
grant select, insert, update, delete on public.content_maps to authenticated;
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
insert into public.content_maps(user_id,author_email,title,problem,visibility) values
(auth.uid(),'private@example.com','Private test','question','private'),
(auth.uid(),'public@example.com','Public test','question','public');
do $$ begin
  if exists(select 1 from public.content_maps where visibility='public' and author_email is not null) then raise exception 'Public insert leaked email'; end if;
  if (select count(*) from public.content_maps) <> 2 then raise exception 'Owner cannot read both maps'; end if;
end $$;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$ begin
  if exists(select 1 from public.content_maps where visibility='private') then raise exception 'Other user saw private map'; end if;
end $$;
set role anon;
set request.jwt.claim.sub='';
do $$ begin
  if (select count(*) from public.content_maps) <> 1 then raise exception 'Anon row visibility failed'; end if;
  if exists(select 1 from public.content_maps where author_email is not null) then raise exception 'Anon saw email'; end if;
end $$;
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
update public.content_maps set visibility='public' where title='Private test';
update public.content_maps set author_email='retry@example.com' where title='Public test';
do $$ begin
  if exists(select 1 from public.content_maps where author_email is not null) then raise exception 'Public update leaked email'; end if;
end $$;
reset role;
alter table public.content_maps disable trigger redact_public_map_author_email;
do $$ begin
  begin
    update public.content_maps set author_email='bypass@example.com';
    raise exception 'Constraint did not protect public rows';
  exception when check_violation then null;
  end;
end $$;
select 'PUBLIC_MAP_PRIVACY_PASS';
`;
  const result = command('psql', ['-h', temp, '-p', '55437', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], setup + fixture + migration + tests);
  assert.match(result, /PUBLIC_MAP_PRIVACY_PASS/);
  console.log('PASS: public insert/update redaction, private-to-public transition, owner/other-user/anonymous RLS, and constraint defense. Isolated PostgreSQL cluster only.');
} finally {
  if (started) command('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  rmSync(temp, {recursive:true,force:true});
}
