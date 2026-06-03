-- ============================================================================
-- RLS schedule test — TODO 5.4
-- Proves the schedules policies (sch_select = is_member_of, sch_write = admin):
--   • an admin of family A can upsert that family's schedule,
--   • a viewer of family A can read it but NOT write,
--   • a member of family B can neither read nor write family A's schedule.
-- Impersonates authenticated users via set role + JWT claims so auth.uid() /
-- is_member_of() / has_family_role() behave exactly as for a logged-in member.
-- Self-contained, non-destructive: runs inside BEGIN … ROLLBACK; assertions
-- raise on failure. A clean run prints "RLS schedule test PASSED".
-- ============================================================================

begin;

-- ---- fixtures (privileged role; RLS not yet in effect) ----------------------
do $$
declare
  v_adminA uuid := '11111111-1111-1111-1111-11111111111a';
  v_viewA  uuid := '11111111-1111-1111-1111-11111111111b';
  v_ownerB uuid := '22222222-2222-2222-2222-22222222222b';
  v_fA uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_fB uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', v_adminA, 'authenticated', 'authenticated', 'admin-a@test.local'),
         ('00000000-0000-0000-0000-000000000000', v_viewA,  'authenticated', 'authenticated', 'view-a@test.local'),
         ('00000000-0000-0000-0000-000000000000', v_ownerB, 'authenticated', 'authenticated', 'owner-b@test.local');

  insert into families (id, name) values (v_fA, 'Family A'), (v_fB, 'Family B');

  insert into memberships (user_id, family_id, role)
  values (v_adminA, v_fA, 'admin'),
         (v_viewA,  v_fA, 'viewer'),
         (v_ownerB, v_fB, 'owner');

  insert into storytellers (id, family_id, name)
  values ('a5701e11-0000-0000-0000-00000000000a', v_fA, 'Storyteller A');
end $$;

-- ============================================================================
-- PASS 1 — admin of A upserts the schedule (sch_write allows admin).
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111111a","role":"authenticated"}';

do $$
declare n int;
begin
  insert into schedules (family_id, storyteller_id, days_of_week, send_time_local, questions_per, paused)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          'a5701e11-0000-0000-0000-00000000000a',
          '{MO,TH}', '09:30', 1, false);

  select count(*) into n from schedules where storyteller_id = 'a5701e11-0000-0000-0000-00000000000a';
  assert n = 1, 'admin A should have created the schedule';

  -- upsert path: change the days as the admin.
  update schedules set days_of_week = '{TU,FR}'
   where storyteller_id = 'a5701e11-0000-0000-0000-00000000000a';
end $$;

reset role;

-- ============================================================================
-- PASS 2 — viewer of A can READ but NOT write (sch_select yes, sch_write no).
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111111b","role":"authenticated"}';

do $$
declare n int; denied boolean := false;
begin
  select count(*) into n from schedules where storyteller_id = 'a5701e11-0000-0000-0000-00000000000a';
  assert n = 1, 'viewer A should be able to read the schedule';

  begin
    update schedules set paused = true
     where storyteller_id = 'a5701e11-0000-0000-0000-00000000000a';
    -- RLS update without a matching row silently affects 0 rows; verify it stuck.
    if (select paused from schedules where storyteller_id = 'a5701e11-0000-0000-0000-00000000000a') then
      denied := false;            -- the write actually applied → policy FAILED
    else
      denied := true;             -- no row updated → write was blocked
    end if;
  exception when others then
    denied := true;               -- or it raised outright
  end;
  assert denied, 'viewer A must NOT be able to write the schedule';
end $$;

reset role;

-- ============================================================================
-- PASS 3 — member of B can neither read nor write family A's schedule.
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-22222222222b","role":"authenticated"}';

do $$
declare n int; denied boolean := false;
begin
  select count(*) into n from schedules where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert n = 0, 'B must NOT see family A schedule';

  begin
    insert into schedules (family_id, storyteller_id, days_of_week)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'a5701e11-0000-0000-0000-00000000000a', '{SA}');
    denied := false;              -- insert succeeded → policy FAILED
  exception when others then
    denied := true;               -- WITH CHECK denied it
  end;
  assert denied, 'B must NOT be able to write into family A schedule';
end $$;

reset role;

do $$ begin raise notice 'RLS schedule test PASSED'; end $$;

rollback;
