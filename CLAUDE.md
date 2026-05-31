# Storyline — Claude Code project brief

> **On startup: read `TODO.md` and continue from the first unchecked task.**
> Check tasks off as you finish them and keep the file current. Prefer small,
> reviewable commits that map to TODO items.

## What this is
Storyline records a family elder's life stories as a short, AI-guided **voice
interview** delivered in a family member's cloned voice. Two surfaces:

1. **Storyteller app** — what the elder uses. SMS magic link → opens in mobile
   Safari (no install, no login) → grants mic once → hears a question in the
   interviewer's voice → answers by talking → an AI follow-up or two → done.
   Designed for older users (large targets, single-tap, voice-first, forgiving).
2. **Family/admin dashboard** — what relatives use. Review stories (audio +
   transcript), steer which topics the AI pursues, manage cadence, see signals
   (mic-failed / schedule suggestion / engaging-less), assemble a keepsake book.

This is a **multi-tenant product**: many unrelated families, each with multiple
storytellers across generations (parent, grandparent, aunt/uncle).

## Stack
- Next.js 15 (App Router, TS, src/) on **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Supabase** (Postgres + RLS + Storage). The Supabase MCP is attached — use it
  to apply migrations, run SQL, and regenerate types. Do not hand-edit prod.
- shadcn/ui + Tailwind; Stripe (billing) and Resend (email) added later
- Anthropic API for the interview brain (server-side only)
- ElevenLabs (cloned-voice TTS), Whisper/Deepgram (STT), Twilio (SMS)
- Deploys: GitHub → Cloudflare (Workers Builds / Git integration), or the
  included GitHub Action.

## Repo map
- `src/app/(marketing)` — public site
- `src/app/(app)` — authenticated family/admin dashboard
- `src/app/(storyteller)/s/[token]` — token-scoped storyteller flow (no login)
- `src/app/api/ai/*` — all Anthropic calls (server-side only)
- `src/app/api/sessions` — session lifecycle (admin/cron-driven)
- `src/app/api/storyteller/*` — storyteller writes; validates magic-link token, writes via service role
- `src/app/api/cron/scheduler` — weekly Worker: sends nudges, runs the 3 signals
- `src/lib/supabase/{client,server,service}.ts` — anon (browser), SSR (member), service-role (server)
- `src/lib/ai` — interviewer prompt assembly + follow-up generation
- `src/lib/sms`, `src/lib/voice`, `src/lib/i18n`
- `supabase/migrations/0001_init.sql` — the multi-tenant schema + RLS
- `supabase/seed/*` — bilingual prompt library (en + es), seeded as global rows

## Non-negotiable rules
- **Tenancy:** every domain row carries `family_id`. Never query across families
  without it. RLS is the security boundary — don't bypass it in app code.
- **Two auth surfaces:** family members use Supabase Auth + `memberships`.
  Storytellers use signed magic-link tokens, never Supabase Auth, and their
  writes go **only** through `api/storyteller/*` using the service role.
- **Service role key is server-only.** Never import `lib/supabase/service` into a
  client component or expose the key to the browser.
- **All Anthropic calls are server-side** via `api/ai/*`. No API key in the client.
- **Sensitive media:** Storage buckets are private; serve audio via short-lived
  signed URLs only after the same membership check.
- **Elder-facing UX:** keep the storyteller surface large-target, single-tap,
  voice-first, forgiving. No timeouts that scold; never dead-end on errors.
- **i18n:** storyteller language is per-storyteller (en/es today). UI strings,
  prompts, voice, STT, and SMS all key off it. Prompt tokens
  ({address},{name},{partner},{asker_relation},{asker_parent}, pronouns) resolve
  at session assembly and are also handed to the AI for correct phrasing.

## Commands
- `npm run dev` — local Next dev
- `npm run preview` — build + run on the Cloudflare runtime locally
- `npm run deploy` — build + `wrangler deploy`
- `npm run db:push` — apply migrations (or use the Supabase MCP)
- `npm run db:types` — regenerate `src/lib/supabase/database.types.ts`
- `npm run seed:prompts` — load the global prompt library

## Definition of done for a task
Type-checks, respects RLS + the rules above, has the relevant `family_id`
scoping, and `TODO.md` is updated.
