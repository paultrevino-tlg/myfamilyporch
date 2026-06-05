-- ============================================================================
-- TODO 7.6 — "Download everything" full-archive export
-- A family can download a ZIP of everything they recorded (audio + transcripts +
-- the latest book PDF) any time, on every tier, even after cancelling. This is
-- the proof of the "you own it forever" promise, so it is NEVER paywalled or
-- role-gated: ANY member may request and download their family's archive.
--
-- Async by design (a chatty storyteller produces a large library): a request
-- inserts a job row (status='queued'); a background worker gathers from Storage,
-- zips, uploads to a private bucket, and flips the row to 'ready' with a path +
-- expiry. The row IS the in-app status; an email links to the login-gated
-- download route. Object retention = expires_at; the cron backstop cleans
-- expired zips and picks up any stuck job.
-- ============================================================================

create type export_status as enum ('queued','preparing','ready','failed');

create table exports (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id)     on delete cascade,
  -- one storyteller per export in v1 (matches the spec's ZIP naming); a future
  -- Family-tier "all storytellers" bundle can relax this to null = whole family.
  storyteller_id  uuid not null references storytellers(id) on delete cascade,
  status          export_status not null default 'queued',
  requested_by    uuid references auth.users(id) on delete set null,
  requested_email text,                       -- where the "ready" email goes
  zip_path        text,                       -- private family-exports bucket key
  story_count     int,
  error           text,                       -- set when status='failed'
  expires_at      timestamptz,                -- object retention / link validity
  ready_at        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on exports (family_id);
create index on exports (storyteller_id);
create trigger trg_exports_u before update on exports
  for each row execute function set_updated_at();

alter table exports enable row level security;

-- Read + create are open to ANY member (ownership is never gated). Updates
-- (status, path, expiry) and deletes are the background worker's job and run
-- through the SERVICE ROLE, which bypasses RLS — so no member write policy.
create policy exp_select on exports for select
  using ( is_member_of(family_id) );
create policy exp_insert on exports for insert
  with check ( is_member_of(family_id) );

-- --- private export bucket --------------------------------------------------
-- Mirrors story-audio (0003) / story-photos (0009): NO public policies ->
-- anon/authenticated default-deny. Writes via SERVICE ROLE (the export worker);
-- reads via short-lived SIGNED URLs minted after the membership check in
-- api/export/download. Keys are namespaced family_id/job_id/<file>.zip.
insert into storage.buckets (id, name, public, file_size_limit)
values (
  'family-exports',
  'family-exports',
  false,
  1073741824  -- 1 GiB ceiling; a whole-archive ZIP can be large
)
on conflict (id) do nothing;
