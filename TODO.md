# Storyline — build plan

Work top to bottom. Check items off as you go. Each phase should leave the app
building and deployable.

## Phase 0 — Project setup
- [ ] 0.1 `npm install`; if any package fails to resolve, install latest and update package.json
- [ ] 0.2 Create the Supabase project (or link existing) and set env vars in `.env.local` + `.dev.vars`
- [ ] 0.3 Apply `supabase/migrations/0001_init.sql` (via Supabase MCP or `npm run db:push`)
- [ ] 0.4 `npm run db:types` to generate database types
- [ ] 0.5 `npm run seed:prompts` to load the bilingual global prompt library
- [ ] 0.6 Confirm `npm run preview` runs on the Cloudflare runtime
- [ ] 0.7 Connect the repo to Cloudflare for auto-deploy (or configure the GitHub Action secrets)

## Phase 1 — Auth, tenancy, membership
- [ ] 1.1 Supabase Auth (passwordless/email) for family members
- [ ] 1.2 `create_family` onboarding flow (caller becomes owner)
- [ ] 1.3 Family switcher; invitations + accept flow; roles (owner/admin/viewer)
- [ ] 1.4 Verify RLS: a member of family A cannot read family B (write a test)

## Phase 2 — Storyteller surface
- [ ] 2.1 Storyteller + relationship CRUD in admin (name, pronouns, birth year, language, address term)
- [ ] 2.2 Magic-link token mint/validate (HMAC, revocable) at `/s/[token]`
- [ ] 2.3 Seven-screen flow (notification→welcome→question→answer→follow-up→answer→done)
- [ ] 2.4 Mic permission priming + denial recovery; emit mic-failed signal + SMS to admin
- [ ] 2.5 Audio capture → private Storage; `api/storyteller/answer` writes via service role
- [ ] 2.6 i18n: render flow in storyteller language (en/es)

## Phase 3 — The AI interview loop
- [ ] 3.1 Session assembly: resolve prompt tokens from storyteller + relationship
- [ ] 3.2 `api/ai/interview`: given the answer + coverage backbone, generate a natural follow-up
- [ ] 3.3 Topic weighting + `applies_to` gating + emotional-weight pacing/avoid rules
- [ ] 3.4 STT transcription pipeline (incl. code-switching tolerance)

## Phase 4 — Voice & messaging
- [ ] 4.1 Voice profile setup (ElevenLabs clone) per interviewer; multilingual TTS
- [ ] 4.2 Question playback in the interviewer's cloned voice
- [ ] 4.3 Twilio SMS nudges (per-storyteller, localized) + deep link

## Phase 5 — Family/admin dashboard
- [ ] 5.1 Overview (status cards + recent stories)
- [ ] 5.2 Stories review (audio + transcript + follow-up thread + edit + in-book + photo)
- [ ] 5.3 Topics steering (focus/ease-off/avoid)
- [ ] 5.4 Schedule (days/time/quiet hours/pause/ask-now)
- [ ] 5.5 Settings (numbers, voice, family access)

## Phase 6 — Signals & adaptive scheduling
- [ ] 6.1 Weekly cron Worker (`api/cron/scheduler`): send nudges
- [ ] 6.2 Signal: mic-failed (already emitted in 2.4) surfaced on Overview
- [ ] 6.3 Signal: schedule suggestion (engages at a different hour) + SMS, throttled
- [ ] 6.4 Signal: engaging-less (sustained drop vs personal baseline) + gentle SMS, throttled
- [ ] 6.5 Sensitivity controls + pause-aware exclusions

## Phase 7 — Keepsake
- [ ] 7.1 Book assembly: chapters by category, reorder, photos
- [ ] 7.2 Voice QR codes that bundle (not just link) the audio so it survives
- [ ] 7.3 Export / print order
- [ ] 7.4 Optional English translation view of Spanish transcripts for family

## Phase 8 — Billing & launch
- [ ] 8.1 Stripe subscription per family (tiered)
- [ ] 8.2 Resend transactional email
- [ ] 8.3 Hardening: rate limits, audit, backups of media
