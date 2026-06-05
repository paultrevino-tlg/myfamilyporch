-- ============================================================================
-- RLS exports test — TODO 7.6
-- Proves the "Download everything" job policies:
--   • exp_select = is_member_of  (ANY role reads their family's exports)
--   • exp_insert = is_member_of  (ANY role may REQUEST — ownership is never
--                                 role-gated; we test with a VIEWER on purpose)
--   • NO member UPDATE policy (status/path/expiry are the worker's job, via the
--     service role) — a member UPDATE must affect no rows.
--   • cross-family isolation: B cannot read or insert into A's exports.
-- Impersonates authenticated users via set role + JWT claims. Self-contained,
-- non-destructive: BEGIN … ROLLBACK. A clean run prints "RLS exports test PASSED".
-- ============================================================================

begin;

-- ---- fixtures (privileged role; RLS not yet in effect) ----------------------
do $$
declare
  v_viewA  uuid := '11111111-1111-1111-1111-11111111111b';
  v_ownerB uuid := '22222222-2222-2222-2222-22222222222b';
  v_fA uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_fB uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_stA uuid := 'a5701e11-0000-0000-0000-00000000000a';
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', v_viewA,  'authenticated', 'authenticated', 'view-a@test.local'),
         ('00000000-0000-0000-0000-000000000000', v_ownerB, 'authenticated', 'authenticated', 'owner-b@test.local');

  insert into families (id, name) values (v_fA, 'Family A'), (v_fB, 'Family B');

  insert into memberships (user_id, family_id, role)
  values (v_viewA,  v_fA, 'viewer'),
         (v_ownerB, v_fB, 'owner');

  insert into storytellers (id, family_id, name)
  values (v_stA, v_fA, 'Storyteller A');
end $$;

-- ============================================================================
-- PASS 1 — a VIEWER of A may REQUEST an export and read it back.
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111111b","role":"authenticated"}';

do $$
declare n int;
begin
  insert into exports (family_id, storyteller_id, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          'a5701e11-0000-0000-0000-00000000000a',
          'queued');

  select count(*) into n from exports
   where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert n = 1, 'viewer A should be able to create + read an export (ownership is not role-gated)';
end $$;

reset role;

-- ============================================================================
-- PASS 2 — a member of A can READ the export but NOT UPDATE it (no write policy).
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111111b","role":"authenticated"}';

do $$
declare denied boolean := false;
begin
  begin
    update exports set status = 'ready'
     where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    if exists (select 1 from exports
                where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
                  and status = 'ready') then
      denied := false;            -- the update applied → policy FAILED
    else
      denied := true;             -- no row updated → blocked (no UPDATE policy)
    end if;
  exception when others then
    denied := true;
  end;
  assert denied, 'a member must NOT be able to update an export (worker-only via service role)';
end $$;

reset role;

-- ============================================================================
-- PASS 3 — member of B can neither read nor insert into family A's exports.
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-22222222222b","role":"authenticated"}';

do $$
declare n int; denied boolean := false;
begin
  select count(*) into n from exports
   where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert n = 0, 'B must NOT see family A export rows';

  begin
    insert into exports (family_id, storyteller_id, status)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'a5701e11-0000-0000-0000-00000000000a', 'queued');
    denied := false;              -- insert succeeded → WITH CHECK FAILED
  exception when others then
    denied := true;               -- WITH CHECK denied it
  end;
  assert denied, 'B must NOT be able to insert into family A exports';
end $$;

reset role;

do $$ begin raise notice 'RLS exports test PASSED'; end $$;

rollback;
