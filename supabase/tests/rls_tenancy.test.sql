-- ============================================================================
-- RLS tenancy test — TODO 1.4
-- Proves the security boundary: a member of family A can never read or write
-- family B's rows. Exercises the real policies in 0001_init.sql by impersonating
-- authenticated users (set role + JWT claims), so auth.uid() / is_member_of()
-- behave exactly as they do for a logged-in family member.
--
-- Self-contained and non-destructive: everything runs inside BEGIN … ROLLBACK,
-- and assertions raise on failure. Re-run any time via the Supabase MCP:
--   execute_sql(<paste this file>)
-- A clean run prints "RLS tenancy test PASSED" and persists nothing.
-- ============================================================================

begin;

-- ---- fixtures (created as the privileged role; RLS not yet in effect) -------
-- Two unrelated families, each with its own owner and one storyteller.
do $$
declare
  v_uA uuid := '11111111-1111-1111-1111-111111111111';
  v_uB uuid := '22222222-2222-2222-2222-222222222222';
  v_fA uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_fB uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', v_uA, 'authenticated', 'authenticated', 'a@test.local'),
         ('00000000-0000-0000-0000-000000000000', v_uB, 'authenticated', 'authenticated', 'b@test.local');

  insert into families (id, name) values (v_fA, 'Family A'), (v_fB, 'Family B');

  insert into memberships (user_id, family_id, role)
  values (v_uA, v_fA, 'owner'),
         (v_uB, v_fB, 'owner');

  insert into storytellers (id, family_id, name)
  values ('a5701e11-0000-0000-0000-00000000000a', v_fA, 'Storyteller A'),
         ('b5701e11-0000-0000-0000-00000000000b', v_fB, 'Storyteller B');
end $$;

-- ---- helper to impersonate a logged-in family member ------------------------
-- (set local persists until the surrounding transaction ends)

-- ============================================================================
-- PASS 1 — impersonate user A; must see only family A.
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare n int;
begin
  -- families: sees A, never B
  select count(*) into n from families where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert n = 1, 'A should see family A';
  select count(*) into n from families where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  assert n = 0, 'A must NOT see family B';
  select count(*) into n from families;            -- total visible
  assert n = 1, 'A should see exactly one family';

  -- storytellers: sees A's, never B's
  select count(*) into n from storytellers where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert n = 1, 'A should see storyteller A';
  select count(*) into n from storytellers where family_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  assert n = 0, 'A must NOT see storyteller B';
  select count(*) into n from storytellers;
  assert n = 1, 'A should see exactly one storyteller';

  -- memberships: sees own roster only, never B's
  select count(*) into n from memberships where family_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  assert n = 0, 'A must NOT see family B memberships';
end $$;

-- write isolation: A inserting into family B must be denied by the WITH CHECK.
do $$
declare denied boolean := false;
begin
  begin
    insert into storytellers (family_id, name)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Injected by A');
  exception when others then
    denied := true;   -- RLS raises insufficient_privilege / check violation
  end;
  assert denied, 'A must NOT be able to write into family B';
end $$;

reset role;

-- ============================================================================
-- PASS 2 — impersonate user B; symmetric check (must see only family B).
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from families;
  assert n = 1, 'B should see exactly one family';
  select count(*) into n from families where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert n = 0, 'B must NOT see family A';

  select count(*) into n from storytellers where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert n = 0, 'B must NOT see storyteller A';
end $$;

reset role;

-- A clean arrival here means every assertion held.
do $$ begin raise notice 'RLS tenancy test PASSED'; end $$;

rollback;
