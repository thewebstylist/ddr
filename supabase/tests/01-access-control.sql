\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

-- Results land here and are asserted at the end, so one failure does not hide
-- the rest.
drop table if exists test.results;
create table test.results (check_name text primary key, ok boolean, detail text);

create or replace function test.record(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into test.results values (p_name, p_ok, p_detail)
  on conflict (check_name) do update set ok = excluded.ok, detail = excluded.detail;
$$;

grant usage on schema test to authenticated;
grant select, insert, update on test.results to authenticated;
grant execute on function test.record(text, boolean, text) to authenticated;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com')
on conflict do nothing;

select test.record('signup trigger creates a profile per account', count(*) = 3, count(*)::text)
from public.profiles;

-- === Alice creates a project ==============================================
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
insert into public.projects (id, name, doc, created_by)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Oak Hill', '{"pages":[]}'::jsonb, auth.uid());
reset role;

select test.record('whoever creates a project owns it', count(*) = 1)
from public.project_members
where project_id = 'aaaaaaaa-0000-0000-0000-000000000001'
  and user_id = '11111111-1111-1111-1111-111111111111' and role = 'owner';

-- === a stranger sees nothing ==============================================
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;

select test.record('a non-member sees no projects', count(*) = 0, count(*)::text) from public.projects;
select test.record('a non-member cannot read the roster', count(*) = 0, count(*)::text) from public.project_roster;
select test.record('a non-member cannot read a stranger''s profile', count(*) = 0, count(*)::text)
from public.profiles where id = '11111111-1111-1111-1111-111111111111';

do $$
begin
  insert into public.project_members (project_id, user_id, role)
  values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'owner');
  perform test.record('a stranger cannot add himself to a project', false, 'the insert succeeded');
exception when insufficient_privilege then
  perform test.record('a stranger cannot add himself to a project', true);
end $$;
reset role;

-- === Alice invites Bob as a viewer ========================================
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
insert into public.project_members (project_id, user_id, role, invited_email)
values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'viewer', 'bob@example.com');
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;
select test.record('an invited viewer can open the project', count(*) = 1, count(*)::text)
from public.projects where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select test.record('a teammate profile becomes visible', count(*) = 1, count(*)::text)
from public.profiles where id = '11111111-1111-1111-1111-111111111111';
select test.record('the roster is visible to members', count(*) = 2, count(*)::text)
from public.project_roster where project_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- viewers cannot write
do $$
declare n int;
begin
  update public.projects set doc = '{"hacked":true}'::jsonb
   where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  perform test.record('a viewer cannot write to the document', n = 0, n::text);

  delete from public.projects where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  perform test.record('a viewer cannot delete the project', n = 0, n::text);
end $$;
reset role;

-- === promote Bob to editor ================================================
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
update public.project_members set role = 'editor'
 where project_id = 'aaaaaaaa-0000-0000-0000-000000000001'
   and user_id = '22222222-2222-2222-2222-222222222222';
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;
do $$
declare n int; before bigint; after bigint;
begin
  select version into before from public.projects where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  update public.projects set doc = '{"pages":[1]}'::jsonb
   where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  perform test.record('an editor can write to the document', n = 1, n::text);

  select version into after from public.projects where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  perform test.record('every write advances the version', after = before + 1, before || ' -> ' || after);

  -- a save based on a version someone else has already moved past
  update public.projects set doc = '{"stale":true}'::jsonb
   where id = 'aaaaaaaa-0000-0000-0000-000000000001' and version = after - 1;
  get diagnostics n = row_count;
  perform test.record('a save based on an old version is refused', n = 0, n::text);
end $$;

do $$
begin
  insert into public.project_members (project_id, user_id, role)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'editor');
  perform test.record('only an owner can hand out access', false, 'an editor invited someone');
exception when insufficient_privilege then
  perform test.record('only an owner can hand out access', true);
end $$;
reset role;

-- === removing someone revokes everything ==================================
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
delete from public.project_members
 where project_id = 'aaaaaaaa-0000-0000-0000-000000000001'
   and user_id = '22222222-2222-2222-2222-222222222222';
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;
select test.record('removing someone revokes access immediately', count(*) = 0, count(*)::text)
from public.projects where id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;

\set QUIET off
select case when ok then 'PASS' else 'FAIL' end as result, check_name, detail
from test.results order by ok, check_name;

do $$
declare failed int;
begin
  select count(*) into failed from test.results where not ok;
  if failed > 0 then raise exception '% access-control check(s) FAILED', failed; end if;
  raise notice 'all % access-control checks passed', (select count(*) from test.results);
end $$;
