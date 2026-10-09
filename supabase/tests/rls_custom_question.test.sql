-- ============================================================================
-- RLS custom-question test — TODO 5.11 (write a new question while moving)
-- The new question is a prompts row with family_id set (pr_write = admin of
-- that family). It joins the interview picker's pool (lang + family_id null or
-- this family) and counts as asked for the storyteller whose story moved to it.
-- Cases:
--   • an admin of family A adds a family question and moves a story onto it:
--     it is in A1's asked set, in sibling A2's pool, and NOT in A2's asked set,
--   • a viewer of family A cannot add a family question (RLS rejects the row),
--   • an owner of family B cannot see family A's question.
-- Self-contained, non-destructive: BEGIN … ROLLBACK; assertions raise on
-- failure. A clean run prints "RLS custom-question test PASSED".
-- ============================================================================

begin;

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
  values (v_adminA, v_fA, 'admin'), (v_viewA, v_fA, 'viewer'), (v_ownerB, v_fB, 'owner');
  insert into storytellers (id, family_id, name, language)
  values ('a5701e11-0000-0000-0000-0000000000a1', v_fA, 'Storyteller A1', 'en'),
         ('a5701e11-0000-0000-0000-0000000000a2', v_fA, 'Storyteller A2', 'en');
  insert into prompts (id, family_id, lang, category, prompt)
  values ('9a000000-0000-0000-0000-0000000000a1', null, 'en', 'Childhood & Early Years', 'First home?');
  insert into answers (id, family_id, storyteller_id, prompt_id, question_text)
  values ('a5a5a5a5-0000-0000-0000-00000000000a', v_fA, 'a5701e11-0000-0000-0000-0000000000a1',
          '9a000000-0000-0000-0000-0000000000a1', 'First home?');
end $$;

set local role authenticated;

-- PASS 1 — viewer of A cannot add a family question.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111111b","role":"authenticated"}';
do $$
begin
  begin
    insert into prompts (family_id, lang, category, prompt)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'en', 'Young Adulthood & Work', 'Viewer question');
    raise exception 'viewer added a family question';
  exception when insufficient_privilege then
    null; -- expected: new row violates row-level security policy
  end;
end $$;

-- PASS 2 — admin of A adds a family question and moves the story onto it.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111111a","role":"authenticated"}';
do $$
declare v_q uuid; n int; in_pool int; a1_asked boolean; a2_asked boolean;
begin
  insert into prompts (id, family_id, lang, category, prompt)
  values ('9c000000-0000-0000-0000-0000000000c1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'en',
          'Young Adulthood & Work', 'Tell me about the hardware store job.')
  returning id into v_q;

  update answers set prompt_id = v_q, question_text = 'Tell me about the hardware store job.', book_sort = null
   where id = 'a5a5a5a5-0000-0000-0000-00000000000a' and family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'admin move updated % rows', n; end if;

  -- The picker's pool for an en storyteller in family A (assembly.ts).
  select count(*) into in_pool from prompts
   where id = v_q and lang = 'en'
     and (family_id is null or family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  if in_pool <> 1 then raise exception 'family question not in the picker pool'; end if;

  select exists(select 1 from answers where storyteller_id = 'a5701e11-0000-0000-0000-0000000000a1' and prompt_id = v_q) into a1_asked;
  select exists(select 1 from answers where storyteller_id = 'a5701e11-0000-0000-0000-0000000000a2' and prompt_id = v_q) into a2_asked;
  if not a1_asked then raise exception 'new question not counted as asked for A1'; end if;
  if a2_asked then raise exception 'new question wrongly counted as asked for A2'; end if;
end $$;

-- PASS 3 — family B cannot see family A's question.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-22222222222b","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from prompts where id = '9c000000-0000-0000-0000-0000000000c1';
  if n <> 0 then raise exception 'family B can see family A''s question'; end if;
end $$;

reset role;
do $$ begin raise notice 'RLS custom-question test PASSED'; end $$;

rollback;
