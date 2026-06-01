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
- [x] 0.7 Connect repo to Cloudflare for auto-deploy — verified live at myfamilyporch.paul-trevino.workers.dev (build cmd `npx opennextjs-cloudflare build`, deploy from `main`)

## Phase 1 — Auth, tenancy, membership
→ read: SPEC § Multi-tenancy & roles · `docs/ARCHITECTURE.md`
- [x] 1.1 Supabase Auth (passwordless/email) for family members — magic-link via Supabase Send Email hook → EmailJS (branded template); verified end-to-end (link → /dashboard → sign-out). Deliverability hardening (authenticated sending domain) tracked separately.
- [x] 1.2 `create_family` onboarding (caller becomes owner) — no-family members are routed to `/onboarding`; name form calls the `create_family` RPC (security-definer, makes caller owner) via a server action, then lands on `/dashboard`
- [x] 1.3 Family switcher; invitations + accept; roles (owner/admin/viewer) — active-family cookie + switcher; admins invite by email (EmailJS) → `/invite/[token]` accept via `accept_invitation` security-definer RPC (migration `0002`); login/callback honor a safe `?next`
- [x] 1.4 Verify RLS: a member of family A cannot read family B — `supabase/tests/rls_tenancy.test.sql` (impersonates authenticated users via JWT claims; asserts cross-family read+write isolation; runs in BEGIN…ROLLBACK). Passed against the linked project; a negative-control run confirms the assertions actually fire.

## Phase 2 — Storyteller surface
→ read: SPEC § Storyteller onboarding & auth, Storyteller session flow, Localization, Elder-facing UX · prototype `docs/prototypes/storyteller-flow.html`
- [x] 2.1 Storyteller + relationship CRUD (name, pronouns, birth year, language, address term) — admin-gated server actions (`storytellers/actions.ts`) + management page (`/storytellers`); storyteller holds shared facts, the per-member relationship holds address term/kind/asker_relation/interviewer (filtered to the signed-in member); dashboard links to it. RLS-conformant (admin writes), no schema change.
- [x] 2.2 Magic-link token mint/validate (HMAC, revocable) at `/s/[token]` — `lib/storyteller/token.ts` (Web Crypto HMAC; store only the hash; fail-closed validate; revoke). `/s/[token]` validates and welcomes (or shows a calm dead-link screen); `api/storyteller/answer` gates on the token. Admin mint/revoke buttons on `/storytellers` (raw URL shown once). Round-trip incl. tamper + revoke verified against the DB. Needs `STORYTELLER_TOKEN_SECRET` as a Cloudflare Worker secret for live use.
- [x] 2.3 Seven-screen flow (notification→welcome→question→answer→follow-up→answer→done) — client state machine `s/[token]/SessionFlow.tsx` (Welcome→Question→Your turn→AI follow-up→Your turn→Done; the prototype's screen-0 notification is the external SMS nudge, Phase 4.3). Elder-facing: one full-screen step, one big single-tap action, forgiving exits ("Maybe later"/"Skip this one"), never dead-ends. New `(storyteller)/layout.tsx` loads Atkinson Hyperlegible + Fraunces (scoped to elder surface). Bilingual via `lib/i18n` (en/es). Clearly-marked seams: mic 2.4, capture/write 2.5, real question+follow-up 3.1/3.2, cloned voice 4.2, `{address}` resolution 3.1. Build/type-check clean; live-verified welcome render EN+ES + soft dead-link against a minted token.
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

## Phase 8 — Public marketing site & signup funnel
→ read: SPEC § Marketing, signup & billing · placeholder `src/app/(marketing)/page.tsx`
English only for v1; bilingual marketing is deferred.
- [ ] 8.1 Marketing shell: nav + footer + legal links; OG/SEO metadata; shared layout
- [ ] 8.2 Landing page (hero, how-it-works, sample story, social proof)
- [ ] 8.3 Pricing page (tier cards + one-time book add-on → CTA)
- [ ] 8.4 FAQ + legal/contact pages (privacy, terms, contact)
- [ ] 8.5 Signup CTA → Stripe Checkout → on success run `create_family` onboarding → dashboard

## Phase 9 — Subscriptions & billing
→ read: SPEC § Marketing, signup & billing · SPEC § Multi-tenancy & roles
Pay-during-signup; subscription (tiered) + one-time book add-on; owner holds billing.
- [ ] 9.1 Stripe products/prices: subscription tiers + one-time book add-on; env + webhook secret on Cloudflare
- [ ] 9.2 Checkout session from pricing/signup CTA (creates customer, ties to `family_id`/owner)
- [ ] 9.3 Webhook handler → persist subscription + entitlement state on the family (migration)
- [ ] 9.4 Billing portal (owner-only: upgrade/downgrade/cancel/update card)
- [ ] 9.5 Feature gating from entitlement state (block dashboard/interviews when unpaid) + optional trial
- [ ] 9.6 One-time book add-on checkout wired to the keepsake export (Phase 7)

## Phase 10 — Launch hardening
- [ ] 10.1 Resend transactional + billing email (migrate off EmailJS where appropriate)
- [ ] 10.2 Rate limits, audit logging, media backups
