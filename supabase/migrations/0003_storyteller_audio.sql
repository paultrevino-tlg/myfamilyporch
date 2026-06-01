-- ============================================================================
-- TODO 2.5 — private Storage for storyteller audio
-- A single private bucket holds every storyteller's recordings. Access model:
--   * Writes come ONLY through api/storyteller/answer using the SERVICE ROLE
--     (after validating a magic-link token). The service role bypasses Storage
--     RLS, so no storyteller-facing policies are needed.
--   * Admin/member playback (TODO 5.2) serves audio via short-lived SIGNED URLs
--     minted server-side after the membership check — never public.
-- We deliberately add NO public policies, so anon/authenticated get default-deny.
-- Object keys are namespaced family_id/storyteller_id/session_id/<uuid>.<ext>.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-audio',
  'story-audio',
  false,
  52428800,  -- 50 MiB; a few minutes of compressed speech sits well under this
  array['audio/webm','audio/mp4','audio/ogg','audio/mpeg']
)
on conflict (id) do nothing;
