# Architecture

## Tenancy
`family` is the tenant. Every domain row carries `family_id`. Separation is
enforced by Postgres Row-Level Security, not app code. Helper functions
`is_member_of(family)` and `has_family_role(family, role)` back every policy.

## Two auth surfaces
- **Family members** authenticate with Supabase Auth; access is granted by rows
  in `memberships(user_id, family_id, role)`. A user can belong to many families
  with a different role in each — no special-casing.
- **Storytellers** never log in. They receive an SMS magic link carrying a
  signed, revocable token scoped to one storyteller. Their reads/writes go
  through `api/storyteller/*`, which validates the token and uses the Supabase
  **service role** (bypasses RLS). A leaked link exposes only that one
  storyteller's recording flow.

## Multi-generation model
`storytellers` holds identity (name, pronouns, birth_year, language).
`storyteller_relationships` is the edge between a member and a storyteller
(address term, asker relation, interviewer flag, voice). The same elder is "Dad"
to one member and "Grandpa" to another.

## Prompts
Global library (`family_id null`) + per-family custom rows. Tokens
({address},{name},{partner},{asker_relation},{asker_parent}, pronouns) resolve at
session assembly from the storyteller + relationship, and the resolved context
is passed to the AI so generated follow-ups are phrased correctly.
`applies_to` gates relationship-specific prompts; `emotional_weight` paces a
session and powers the "avoid" control.

## Signals (weekly cron Worker)
1. **mic-failed** — acute, surfaced + SMS to admin.
2. **schedule suggestion** — engages at a consistent different hour → recommend a shift.
3. **engaging-less** — sustained drop vs the storyteller's own baseline → gentle
   "give them a call" nudge. Humble, non-clinical, throttled, pause-aware.
