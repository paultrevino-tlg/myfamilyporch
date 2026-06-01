-- Always-displayable recording links (storyteller management UI).
-- The token's HMAC hash (token_hash) stays the lookup/validation key and the
-- only thing needed to verify a presented link. token_enc additionally stores
-- the raw token encrypted at rest (AES-GCM, key derived from
-- STORYTELLER_TOKEN_SECRET) so an admin can re-display the shareable /s/<token>
-- URL on every visit — without a DB leak alone yielding usable links.
-- Legacy rows minted before this migration stay null and can't be re-displayed
-- (the UI prompts to regenerate); they keep validating via token_hash.
alter table storyteller_tokens add column token_enc text;

comment on column storyteller_tokens.token_enc is
  'AES-GCM(iv||ciphertext) base64url of the raw token, for re-displaying the shareable recording URL. Key derived from STORYTELLER_TOKEN_SECRET. Null for links minted before migration 0004.';
