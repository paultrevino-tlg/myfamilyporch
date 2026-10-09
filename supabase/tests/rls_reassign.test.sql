-- ============================================================================
-- RLS reassign test — TODO 5.9 (move a story to a different question)
-- The move is an UPDATE of answers.prompt_id / question_text / book_sort under
-- ans_write (admin). The "asked" set the interview picker uses is
-- answers.prompt_id for the storyteller, so a move must free the old question.
-- Cases:
--   • an admin of family A moves a story P1 → P2: P1 leaves the asked set, P2
--     joins it, book_sort is cleared,
--   • a viewer of family A cannot move it (0 rows, unchanged),
--   • an owner of family B cannot move it (0 rows, unchanged),
--   • family B's custom question is invisible to family A's admin (pr_select),
--     which is what lets reassignStory refuse a forged cross-family prompt id.
-- Impersonates authenticated users via set role + JWT claims. Self-contained,
-- non-destructive: BEGIN … ROLLBACK; assertions raise on failure. A clean run
-- prints "RLS reassign test PASSED".
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

  insert into storytellers (id, family_id, name) values (v_st, v_fA, 'Storyteller A');
  -- The viewer is granted this storyteller, so a refused write is the role, not visibility.
  insert into storyteller_access (family_id, user_id, storyteller_id) values (v_fA, v_viewA, v_st);

  insert into prompts (id, family_id, lang, category, prompt)
  values ('9a000000-0000-0000-0000-0000000000a1', null, 'en', 'Childhood', 'First home?'),
         ('9a000000-0000-0000-0000-0000000000a2', null, 'en', 'Work', 'First job?'),
         ('9b000000-0000-0000-0000-0000000000b1', v_fB, 'en', 'Family B', 'B-only question');

  insert into answers (id, family_id, storyteller_id, prompt_id, question_text, book_sort)
  values ('a5a5a5a5-0000-0000-0000-00000000000a', v_fA, v_st,
          '9a000000-0000-0000-0000-0000000000a1', 'First home?', 3.5);
end $$;

-- ============================================================================
-- PASS 1 — viewer of A cannot move the story.
-- ============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111111b","role":"authenticated"}';
do $$
declare n int;
begin
  update answers set prompt_id = '9a000000-0000-0000-0000-0000000000a2'
   where id = 'a5a5a5a5-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'viewer moved a story (% rows)', n; end if;
end $$;

-- ============================================================================
-- PASS 2 — owner of family B cannot move it.
-- ============================================================================
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-22222222222b","role":"authenticated"}';
do $$
declare n int;
begin
  update answers set prompt_id = '9a000000-0000-0000-0000-0000000000a2'
   where id = 'a5a5a5a5-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'cross-family owner moved a story (% rows)', n; end if;
end $$;

-- ============================================================================
-- PASS 3 — admin of A: B's custom question is invisible; the move succeeds and
-- frees the original question.
-- ============================================================================
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-11111111111a","role":"authenticated"}';
do $$
declare n int; asked uuid[]; bs float8;
begin
  select count(*) into n from prompts where id = '9b000000-0000-0000-0000-0000000000b1';
  if n <> 0 then raise exception 'family B custom question visible to family A admin'; end if;

  update answers
     set prompt_id = '9a000000-0000-0000-0000-0000000000a2', question_text = 'First job?', book_sort = null
   where id = 'a5a5a5a5-0000-0000-0000-00000000000a'
     and family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'admin move updated % rows, expected 1', n; end if;

  -- The picker's asked set (assembly.ts): prompt_ids answered by this storyteller.
  select array_agg(prompt_id) into asked from answers
   where storyteller_id = 'a5701e11-0000-0000-0000-00000000000a' and prompt_id is not null;
  if '9a000000-0000-0000-0000-0000000000a1' = any(asked) then
    raise exception 'original question still counted as asked after the move';
  end if;
  if not ('9a000000-0000-0000-0000-0000000000a2' = any(asked)) then
    raise exception 'new question not counted as asked after the move';
  end if;

  select book_sort into bs from answers where id = 'a5a5a5a5-0000-0000-0000-00000000000a';
  if bs is not null then raise exception 'book_sort not cleared (%)', bs; end if;
end $$;

-- Viewer/owner attempts above left the row untouched before the admin move.
reset role;
do $$ begin raise notice 'RLS reassign test PASSED'; end $$;

rollback;
