# PLAN — Storyteller consent-flow redesign

Source spec: `docs/consent-flow.md` (+ `setup-overview.svg` visual reference).
Supersedes the proxy-consent "reply YES" SMS model shipped in TODO 4.3 / migration
`0014`. Master-architecture section that applies: **Email & messaging → SMS via
Twilio + A2P 10DLC** (this plan conforms to the fetch/failure-contract/gate rules
there).

## Why

The deployed model was rejected twice by carriers (error 30909): it relies on
**proxy consent** (a family member attests on the recipient's behalf) and it sends
an **A2P message to a number that never opted in** (the "reply YES" text itself).
`consent-flow.md` fixes both root causes:

1. The storyteller's **first-ever contact is P2P** — a copy-paste block the family
   member sends from *their own* phone. Nothing from our A2P system reaches the
   storyteller until they opt in.
2. Consent is the **storyteller's own first-person tap** on an authorization page,
   backed by an append-only `consent_events` audit trail, a global
   `sms_suppressions` list, an `sms_inbound` log + natural-language review queue,
   and bilingual (EN/ES) keyword + natural-language opt-out matching.

## Decisions locked (2026-07-13)

- **Member A2P: full per SPEC.** The family member enters their own number + SMS
  opt-in at signup, receives a magic-link SMS to verify possession, and receives
  the copy-block + "ready to begin" A2P texts.
- **Consent column: renamed to `consent_state`** with `pending` / `opted_in` /
  `opted_out` (SPEC vocabulary), on both `storytellers` and `memberships`.
- **Cutover: full replace.** The "reply YES" confirmation + the attestation
  checkbox are removed, not kept behind a flag.
- **Setup wizard: build a real multi-step wizard**, with `setup-overview` as its
  first screen.

## Open sub-decision (to confirm at Phase B Gate 1)

The member SMS magic-link mechanism. Proposed default: keep **email as the account
identity** and use a signed-token route that proves phone possession + stamps
opt-in + lands the member in a session (via Supabase admin-generated link), rather
than switching primary auth to phone OTP.

## Removal list

| Item | Where | Action |
|---|---|---|
| A2P "reply YES" confirmation send to un-opted-in storyteller | `lib/sms/nudge.ts`, `buildConfirmation`, `sms_confirm*` i18n | Remove (Phase F) |
| Family-member attestation checkbox ("I confirm this person has agreed…") | `storytellers/[id]/page.tsx`, its `error===consent` handling | Remove (Phase D) |
| Inbound `YES → opted_in` cold auto-opt-in | `api/sms/inbound` | Rewrite: START/YES only resubscribes after a prior STOP (Phase F) |
| English-only exact-match keyword handling | `api/sms/inbound` | Rewrite: bilingual + natural-language + suppressions/inbound log (Phase F) |
| `/sms` page describing the "reply YES" flow | `(marketing)/sms/page.tsx` | Rewrite to the P2P + authorization-page flow (Phase G) |
| Hosted screenshots `opt-in-form.png`, `awaiting-yes.png` | `public/sms/` | Replace with new-flow screenshots (Phase G) |

## Phases (each = its own Gate 1/Gate 2)

- **A — Schema & audit spine.** `consent_events`, `sms_suppressions`, `sms_inbound`;
  rename storyteller `sms_consent`→`consent_state`; add member `consent_state` +
  `sms_phone` + `language` on `memberships`; `consent_events.language`. Mechanical
  code rename to keep the build green. **[DONE — migration `0015`.]**
- **B — Member phone verify + SMS opt-in** at signup (member magic-link SMS,
  possession + opt-in `consent_event`). **[DONE — 2026-07-13.]** Mechanism
  confirmed: email stays the account identity; the SMS link only proves
  possession + stamps opt-in. `lib/consent/token.ts` (shared signed token, also
  used by Phase C) + `lib/consent/member.ts`; `(app)/verify-phone` form +
  token-gated `/verify/[token]` confirm; onboarding + dashboard-banner entry.
  16/16 live checks, DB restored.
- **C — Consent token + storyteller authorization page** (elder-accessible,
  bilingual, "Hear this" audio) → `consent_events` + `opted_in` + step-9/10 sends.
  **[DONE — 2026-07-13.]** `lib/consent/storyteller.ts` (buildConsentLink /
  loadConsentContext / confirmStorytellerConsent, fresh opt-in clears
  suppression, step-9 storyteller + step-10 gated member sends) +
  `lib/sms/suppression.ts`; `(storyteller)/c/[token]` page + HearThis
  (SpeechSynthesis) + token-gated action. 13/13 live checks, DB restored. Link
  minting is wired into the UI by Phase D.
- **D — Copy-paste P2P block** in-app after number entry; remove the attestation
  checkbox.
- **E — Setup wizard + `setup-overview` graphic** (responsive, localized,
  `prefers-reduced-motion`); C/D become wizard steps.
- **F — Inbound rewrite + universal pre-send gate** (bilingual keywords, NL
  opt-out, suppressions, inbound log, START-after-STOP, provider reconciliation);
  drop the confirmation branch in `nudge.ts`.
- **G — `/sms` rewrite + fresh screenshots + A2P campaign resubmit.**

## Launch gate (non-code)

Per the spec's closing note: have a **TCPA attorney sign off** on the flow +
disclosure wording (and the Spanish notice) before launch.

---

## Phase A — completion summary (2026-07-13)

- **Migration `0015_consent_flow.sql`** applied to the linked project (`consent_flow`).
  - Renamed `storytellers.sms_consent`→`consent_state`, remapped values 1:1
    (`confirmed`→`opted_in`, `stopped`→`opted_out`), new check constraint.
  - Added `memberships.sms_phone`, `.consent_state`, `.sms_confirm_sent_at`,
    `.language`.
  - Created `consent_events` (append-only; RLS `ce_select` = `is_member_of`,
    service-role writes only), `sms_suppressions` (global, RLS on / no policies),
    `sms_inbound` (global, RLS on / no policies).
- **Types** regenerated (`src/lib/supabase/database.types.ts`).
- **Mechanical rename** (behavior-preserving) in `lib/sms/nudge.ts`,
  `api/sms/inbound/route.ts`, `settings/actions.ts`, and a stale comment in
  `(marketing)/sms/page.tsx`.
- **Verified:** `npx tsc --noEmit` clean; `npm run build` exit 0; grep confirms no
  `sms_consent` remains in `src`; DB checks confirm the four new membership
  columns, three new tables with RLS enabled, and the `ce_select` policy. The
  storytellers table is currently empty in prod, so the rename/remap ran with no
  data at risk.
