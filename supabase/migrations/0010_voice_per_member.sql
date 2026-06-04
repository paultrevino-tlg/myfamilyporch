-- ============================================================================
-- Voices attach to the family MEMBER, not to a (member, storyteller) edge.
-- A member records their voice once (Settings -> My voice); the storyteller
-- config picks WHICH family member interviews that elder, and playback uses
-- that member's voice. voice_profiles already carries owner_user_id — this
-- migration makes it the canonical key and removes the per-relationship link.
--
-- Safe: there are zero voice_profiles in the project today, so nothing to
-- migrate and dropping the old column orphans nothing.
-- ============================================================================

-- One cloned voice per member, per family. owner_user_id becomes the identity of
-- a voice profile (re-record replaces the same row in app code).
create unique index if not exists voice_profiles_family_owner_uniq
  on voice_profiles (family_id, owner_user_id)
  where owner_user_id is not null;

-- Exactly one interviewer per storyteller — "who asks the questions" is singular.
create unique index if not exists storyteller_rel_one_interviewer
  on storyteller_relationships (storyteller_id)
  where is_interviewer;

-- Voice is no longer linked per relationship; resolution joins the interviewer
-- member -> voice_profiles.owner_user_id. Drop the dead column (+ its FK).
alter table storyteller_relationships drop column if exists voice_profile_id;
