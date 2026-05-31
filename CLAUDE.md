# Storyline — Claude Code project brief

> **On startup: read `TODO.md` and continue from the first unchecked task.**
> Check tasks off as you finish them and keep the file current. Prefer small,
> reviewable commits that map to TODO items. Build UI to match the prototypes in
> `docs/prototypes/` (open them in a browser) — they are the source of truth for
> layout, copy, tone, and interaction.

## What this is
Storyline records a family elder's life stories as a short, AI-guided **voice
interview** delivered in a family member's cloned voice, and turns them into a
keepsake. Multi-tenant product: many unrelated families, each with multiple
storytellers across generations (parent, grandparent, aunt/uncle).

## Design references
- `docs/prototypes/storyteller-flow.html` — the elder's 7-screen session (EN/ES toggle)
- `docs/prototypes/family-admin.html` — the family/admin dashboard (3 signals, stories, topics, schedule, book, settings)
- `docs/ARCHITECTURE.md` — tenancy, auth, prompts, signals

## Stack
- Next.js 15 (App Router, TS, `src/`) on **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Supabase** (Postgres + RLS + Storage). The Supabase MCP is attached — use it
  to apply migrations, run SQL, regenerate types. Don't hand-edit prod.
- shadcn/ui + Tailwind; Stripe (billing) + Resend (email) later
- Anthropic API = the interview brain (server-side only)
- ElevenLabs (cloned-voice TTS), Whisper/Deepgram (STT), Twilio (SMS)
- Deploy: GitHub → Cloudflare (Workers Builds / Git integration), or the included Action

## Repo map
- `src/app/(marketing)` — public site
- `src/app/(app)` — authenticated family/admin dashboard
- `src/app/(storyteller)/s/[token]` — token-scoped storyteller flow (no login)
- `src/app/api/ai/*` — all Anthropic calls (server-side only)
- `src/app/api/sessions` — session lifecycle (admin/cron)
- `src/app/api/storyteller/*` — storyteller writes; validates magic-link token, writes via service role
- `src/app/api/cron/scheduler` — weekly Worker: nudges + the 3 signals
- `src/lib/supabase/{client,server,service}.ts` — anon / SSR-member / service-role
- `src/lib/{ai,sms,voice,i18n}` — interview brain, Twilio, TTS, UI strings
- `supabase/migrations/0001_init.sql` — multi-tenant schema + RLS
- `supabase/seed/*` — bilingual prompt library (en + es), seeded as global rows

## Non-negotiable rules
- **Tenancy:** every domain row carries `family_id`. RLS is the security boundary —
  don't bypass it in app code. Members of family A must never read family B.
- **Two auth surfaces:** family members → Supabase Auth + `memberships`.
  Storytellers → signed magic-link tokens, never Supabase Auth; their writes go
  **only** through `api/storyteller/*` using the service role.
- **Service role key is server-only.** Never import `lib/supabase/service` into a
  client component or expose the key to the browser.
- **All Anthropic calls server-side** via `api/ai/*`. No API key in the client.
- **Sensitive media:** Storage buckets private; serve audio via short-lived signed
  URLs only after the same membership check.
- **Elder-facing UX:** storyteller surface stays large-target, single-tap,
  voice-first, forgiving. No scolding timeouts; never dead-end on an error.

---

# Product spec (consolidated decisions)

## Storyteller onboarding & auth
- Reach the elder by **SMS** (not push): "Hi {address}, it's {interviewer} — tap
  here to tell me a story 💬 [link]". The link is a **magic link** that both
  authenticates and opens the session.
- Opens in **mobile Safari** — no install, no password, no home-screen step.
  (We deliberately avoided iOS PWA push / CallKit for v1; SMS is more reliable
  and familiar for older users. Revisit native only if needed.)
- The only first-run action is granting the **microphone** once. **Prime it**
  with a friendly screen in the interviewer's voice before triggering the iOS
  prompt (iOS gives one clean shot). If denied → calm recovery screen, and emit a
  **mic-failed** signal that also **texts the admin** (throttled).
- Alt path (if remote setup is too fragile): ship a pre-configured device. Same
  code; just skip onboarding.
- Tokens are HMAC-signed, scoped to one storyteller, revocable (`storyteller_tokens`).

## Storyteller session flow (match storyteller-flow.html)
Seven screens: **Notification → Welcome → Question → Your turn → AI follow-up →
Your turn → Done.** Two taps to start talking; the rest is voice. Question is
spoken in the interviewer's cloned voice with large text as a backup channel.
One or two questions per session, by design — never overwhelm. Identical answer
screens for consistency. Warm close; confirm saved; reinforce "that's plenty."

## The AI interview loop
- The prompt library is a **coverage backbone**, not a script. The AI follows the
  thread the elder opens and asks natural follow-ups.
- At session assembly, resolve prompt tokens from the storyteller + relationship
  and hand the **resolved context** to the AI so its follow-ups are phrased
  correctly (relationship, names, pronouns, era from birth_year).
- Respect `applies_to` gating and **emotional_weight** pacing: open with warm-ups,
  never stack two heavy prompts, gate heavy/legacy prompts behind a few sessions,
  honor the admin's **Avoid** topics, and stop if the elder declines.
- Tolerate **code-switching** (EN/ES mid-sentence); follow the elder's language,
  don't correct.

## Voice
- One **cloned voice per interviewer** (ElevenLabs multilingual). Decision per
  family: record native-language samples for a clean clone, or generate the
  storyteller's language through an English-trained voice (may be lightly accented).
- Questions play in that voice; STT transcribes the elder's answers.

## Localization
- Language is **per-storyteller** (en/es today). It drives UI strings, prompt set,
  voice, STT, and SMS. Prompt tokens resolve from data, so gendered family terms
  (tío/tía, abuelo/abuela) come through correctly. Admin (family member) UI locale
  is independent of the storyteller's language.

## Multi-tenancy & roles
- `family` = tenant. `memberships(user_id, family_id, role)` is many-to-many, role
  per family, so one user can be `owner` of one family and `viewer` of another.
- Roles: **owner** (created family, billing), **admin** (steer/schedule/trigger/
  invite), **viewer** (hear + read only). Family switcher is UX, not security.

## Multi-generation relationship model
- `storytellers`: name, **pronouns** (he/she/they — covers male/female, drives
  language), **birth_year**, language.
- `storyteller_relationships`: the edge per member→storyteller (address term,
  asker relation, interviewer flag, voice). Same elder is "Dad" to one, "Grandpa"
  to another.
- Prompt tokens: `{address} {name} {they}/{them}/{their} {partner}
  {asker_relation} {asker_parent}`.

## The three signals (weekly cron) + adaptive scheduling
Plain arithmetic over session events; explainable; throttled; pause-aware.
1. **mic-failed** — acute/technical, red tone, surfaced + SMS to admin.
2. **schedule suggestion** — elder consistently engages at a different hour than
   nudged → recommend a time shift (positive tone) + SMS. Requires a baseline +
   a meaningful, sustained gap. Recommend, never auto-change.
3. **engaging-less** — sustained drop vs the elder's **own** baseline → gentle,
   non-clinical "might be a nice time to call" (quiet tone) + one throttled SMS.
   Never diagnose; the point is to prompt human contact, not replace it. Tunable,
   incl. off. Separate this from "wrong time" — different message, same pipeline.

## Admin dashboard surfaces (match family-admin.html)
Overview (status + 3 signals + recent), Stories (audio + transcript + follow-up
thread + edit + in-book + photo + skip handling), Topics (focus/ease-off/avoid),
Schedule (days/time/quiet hours/pause/ask-now), The Book, Settings (storyteller
phone, admin alert number, cloned voice, family access).

## The keepsake book
Stories marked "in the book" arrange into chapters by category; reorder; attach
photos. Each story gets a **voice QR** to the recording. Lesson from competitor
reviews: **bundle the audio** with the export, don't only link to our servers, so
the keepsake survives independently.

## Elder-facing UX principles
Large targets, single tap, no precision gestures, high-contrast large type, speak
everything (don't rely on reading), radical consistency, forgiving (no scolding
timeouts, never strand the user), calm palette. Atkinson Hyperlegible for UI text.

---

## Commands
- `npm run dev` — local Next dev
- `npm run preview` — build + Cloudflare runtime locally
- `npm run deploy` — build + `wrangler deploy`
- `npm run db:push` — apply migrations (or use the Supabase MCP)
- `npm run db:types` — regenerate `src/lib/supabase/database.types.ts`
- `npm run seed:prompts` — load the bilingual global library

## Definition of done for a task
Type-checks; respects RLS + the rules above; correct `family_id` scoping; matches
the relevant prototype; `TODO.md` updated.
