# My Family Porch — build plan

Work top to bottom. Check items off as you go. Each phase has a **→ read** line:
open those `docs/SPEC.md` sections and prototypes before building, not the whole
spec. Each phase should leave the app building and deployable.

## Phase 0 — Project setup
→ read: `docs/ARCHITECTURE.md`
- [x] 0.1 `npm install`; if any package fails to resolve, install latest and update package.json
- [x] 0.2 Create/link the Supabase project; set env in `.env.local` + `.dev.vars`
- [x] 0.3 Apply `supabase/migrations/0001_init.sql` (Supabase MCP or `npm run db:push`)
- [x] 0.4 `npm run db:types`
- [x] 0.5 `npm run seed:prompts` (bilingual global library)
- [x] 0.6 Confirm `npm run preview` runs on the Cloudflare runtime
- [ ] 0.7 Connect repo to Cloudflare for auto-deploy (or set the GitHub Action secrets)

## Phase 1 — Auth, tenancy, membership
→ read: SPEC § Multi-tenancy & roles · `docs/ARCHITECTURE.md`
- [ ] 1.1 Supabase Auth (passwordless/email) for family members
- [ ] 1.2 `create_family` onboarding (caller becomes owner)
- [ ] 1.3 Family switcher; invitations + accept; roles (owner/admin/viewer)
- [ ] 1.4 Verify RLS: a member of family A cannot read family B (write a test)

## Phase 2 — Storyteller surface
→ read: SPEC § Storyteller onboarding & auth, Storyteller session flow, Localization, Elder-facing UX · prototype `docs/prototypes/storyteller-flow.html`
- [ ] 2.1 Storyteller + relationship CRUD (name, pronouns, birth year, language, address term)
- [ ] 2.2 Magic-link token mint/validate (HMAC, revocable) at `/s/[token]`
- [ ] 2.3 Seven-screen flow (notification→welcome→question→answer→follow-up→answer→done)
- [ ] 2.4 Mic priming + denial recovery; emit mic-failed signal + SMS to admin
- [ ] 2.5 Audio capture → private Storage; `api/storyteller/answer` writes via service role
- [ ] 2.6 i18n: render flow in storyteller language (en/es)

## Phase 3 — The AI interview loop
→ read: SPEC § The AI interview loop, Multi-generation relationship model
- [ ] 3.1 Session assembly: resolve prompt tokens from storyteller + relationship
- [ ] 3.2 `api/ai/interview`: generate a natural follow-up from answer + coverage
- [ ] 3.3 Topic weighting + `applies_to` gating + emotional-weight pacing/avoid rules
- [ ] 3.4 STT transcription (incl. code-switching tolerance)

## Phase 4 — Voice & messaging
→ read: SPEC § Voice, Localization
- [ ] 4.1 Voice profile setup (ElevenLabs clone) per interviewer; multilingual TTS
- [ ] 4.2 Question playback in the interviewer's cloned voice
- [ ] 4.3 Twilio SMS nudges (per-storyteller, localized) + deep link

## Phase 5 — Family/admin dashboard
→ read: SPEC § Admin dashboard surfaces · prototype `docs/prototypes/family-admin.html`
- [ ] 5.1 Overview (status cards + recent stories)
- [ ] 5.2 Stories review (audio + transcript + follow-up thread + edit + in-book + photo)
- [ ] 5.3 Topics steering (focus/ease-off/avoid)
- [ ] 5.4 Schedule (days/time/quiet hours/pause/ask-now)
- [ ] 5.5 Settings (numbers, voice, family access)

## Phase 6 — Signals & adaptive scheduling
→ read: SPEC § The three signals & adaptive scheduling · prototype toggle in `docs/prototypes/family-admin.html`
- [ ] 6.1 Weekly cron Worker (`api/cron/scheduler`): send nudges
- [ ] 6.2 Signal: mic-failed surfaced on Overview
- [ ] 6.3 Signal: schedule suggestion (different hour) + SMS, throttled
- [ ] 6.4 Signal: engaging-less (sustained drop vs personal baseline) + gentle SMS, throttled
- [ ] 6.5 Sensitivity controls + pause-aware exclusions

## Phase 7 — Keepsake
→ read: SPEC § The keepsake book
- [ ] 7.1 Book assembly: chapters by category, reorder, photos
- [ ] 7.2 Voice QR codes that bundle (not just link) the audio
- [ ] 7.3 Export / print order
- [ ] 7.4 Optional English translation view of Spanish transcripts

## Phase 8 — Billing & launch
- [ ] 8.1 Stripe subscription per family (tiered)
- [ ] 8.2 Resend transactional email
- [ ] 8.3 Hardening: rate limits, audit, media backups
