-- ============================================================================
-- RLS book test — TODO 7.1
-- Proves the keepsake policies:
--   • story_photos: sp_select = is_member_of, sp_write = admin
--   • storytellers.book_chapter_order rides the existing st_write (admin) policy
-- Cases:
--   • an admin of family A can insert a story_photos row + set chapter order,
--   • a viewer of family A can read the photo row but NOT write it,
--   • a member of family B can neither read nor write family A's photo row.
-- Impersonates authenticated users via set role + JWT claims so auth.uid() /
-- is_member_of() / has_family_role() behave exactly as for a logged-in member.
-- Self-contained, non-destructive: BEGIN … ROLLBACK; assertions raise on
-- failure. A clean run prints "RLS book test PASSED".
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
  v_st uuid := 'a5701e11-0000-0000-0000-00000000000a';
  v_ans uuid := 'a5a5a5a5-0000-0000-0000-00000000000a';
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
  values (v_st, v_fA, 'Storyteller A');

  insert into answers (id, family_id, storyteller_id, in_book)
  values (v_ans, v_fA, v_st, true);
end $$;

-- ============================================================================
-- PASS 1 — admin of A inserts a photo row + sets chapter order.
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111111a","role":"authenticated"}';

do $$
declare n int; ord text[];
begin
  insert into story_photos (family_id, answer_id, storage_path, sort)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          'a5a5a5a5-0000-0000-0000-00000000000a',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/a5701e11-0000-0000-0000-00000000000a/a5a5a5a5-0000-0000-0000-00000000000a/p1.jpg',
          0);

  select count(*) into n from story_photos
   where answer_id = 'a5a5a5a5-0000-0000-0000-00000000000a';
  assert n = 1, 'admin A should have created the photo row';

  update storytellers
     set book_chapter_order = '{"Childhood & Early Years","Legacy & Things Left to Say"}'
   where id = 'a5701e11-0000-0000-0000-00000000000a';

  select book_chapter_order into ord from storytellers
   where id = 'a5701e11-0000-0000-0000-00000000000a';
  assert ord[1] = 'Childhood & Early Years', 'admin A should have set the chapter order';
end $$;

reset role;

-- ============================================================================
-- PASS 2 — viewer of A can READ but NOT write the photo (sp_select / sp_write).
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111111b","role":"authenticated"}';

do $$
declare n int; denied boolean := false;
begin
  select count(*) into n from story_photos
   where answer_id = 'a5a5a5a5-0000-0000-0000-00000000000a';
  assert n = 1, 'viewer A should be able to read the photo row';

  begin
    update story_photos set caption = 'sneaky'
     where answer_id = 'a5a5a5a5-0000-0000-0000-00000000000a';
    if (select caption from story_photos
         where answer_id = 'a5a5a5a5-0000-0000-0000-00000000000a') = 'sneaky' then
      denied := false;            -- the write actually applied → policy FAILED
    else
      denied := true;             -- no row updated → write was blocked
    end if;
  exception when others then
    denied := true;
  end;
  assert denied, 'viewer A must NOT be able to write the photo row';
end $$;

reset role;

-- ============================================================================
-- PASS 3 — member of B can neither read nor write family A's photo row.
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-22222222222b","role":"authenticated"}';

do $$
declare n int; denied boolean := false;
begin
  select count(*) into n from story_photos
   where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert n = 0, 'B must NOT see family A photo rows';

  begin
    insert into story_photos (family_id, answer_id, storage_path)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'a5a5a5a5-0000-0000-0000-00000000000a', 'forged/key.jpg');
    denied := false;              -- insert succeeded → policy FAILED
  exception when others then
    denied := true;               -- WITH CHECK denied it
  end;
  assert denied, 'B must NOT be able to write into family A photos';
end $$;

reset role;

do $$ begin raise notice 'RLS book test PASSED'; end $$;

rollback;
