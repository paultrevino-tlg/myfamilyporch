-- ============================================================================
-- TODO 7.1 — The keepsake book
-- Stories marked `in_book` arrange into chapters by category; admins reorder
-- chapters + stories and attach photos. All additive — no data migration.
--
--   * Story order within a chapter: answers.book_sort (null -> created_at).
--     Float so a drag-drop insert between two rows is one UPDATE (no renumber).
--   * Chapter order: storytellers.book_chapter_order (ordered category names;
--     null -> a canonical life-arc default resolved in app code).
--   * Photos (multiple per story): story_photos table + a private story-photos
--     bucket. Same access model as story-audio: service-role writes, signed-URL
--     reads after a membership check; no public Storage policies.
-- ============================================================================

-- --- ordering --------------------------------------------------------------
alter table answers      add column if not exists book_sort          double precision;
alter table storytellers add column if not exists book_chapter_order text[];

-- --- photos ----------------------------------------------------------------
create table if not exists story_photos (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families(id)  on delete cascade,
  answer_id    uuid not null references answers(id)   on delete cascade,
  storage_path text not null,                 -- private story-photos bucket key
  caption      text,
  sort         double precision not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists story_photos_family_idx on story_photos (family_id);
create index if not exists story_photos_answer_idx on story_photos (answer_id);

alter table story_photos enable row level security;

-- Same boundary as answers: any member of the family reads; only admins write.
create policy sp_select on story_photos for select
  using ( is_member_of(family_id) );
create policy sp_write  on story_photos for all
  using ( has_family_role(family_id,'admin') )
  with check ( has_family_role(family_id,'admin') );

-- --- private photo bucket ---------------------------------------------------
-- Mirrors story-audio (0003): NO public policies -> anon/authenticated default-
-- deny. Writes via SERVICE ROLE (api/book/photo, admin-gated); reads via short-
-- lived SIGNED URLs minted after the membership check. Keys are namespaced
-- family_id/storyteller_id/answer_id/<uuid>.<ext>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-photos',
  'story-photos',
  false,
  10485760,  -- 10 MiB; a family photo sits well under this
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;
